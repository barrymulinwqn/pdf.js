/* Copyright 2024 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** @typedef {import("./event_utils.js").EventBus} EventBus */

/**
 * Manages temporary highlight overlays for filter view selections
 */
class FilterHighlightOverlay {
  #eventBus = null;

  #currentOverlay = null;

  #uiManager = null;

  constructor(eventBus) {
    this.#eventBus = eventBus;
    this.#addEventListeners();
  }

  #addEventListeners() {
    this.#eventBus._on("filterhighlightselected", evt => {
      this.showHighlight(evt.pageNumber, evt.location);
    });

    // Listen for UI manager initialization
    this.#eventBus._on("annotationeditoruimanager", ({ uiManager }) => {
      this.#uiManager = uiManager;
    });
  }

  /**
   * Show a temporary highlight overlay on the specified page
   * @param {number} pageNumber - The page number (1-indexed)
   * @param {Object} location - The location coordinates {x, y, width, height}
   *                            where x, y are in PDF coordinates from stored data
   */
  async showHighlight(pageNumber, location) {
    // Clear any existing highlight
    this.clearHighlight();

    // Get the annotation editor UI manager
    const uiManager = this.#uiManager || window.PDFViewerApplication?.pdfViewer?.annotationEditorUIManager;

    if (!uiManager) {
      console.error("UI Manager not initialized. Please enable annotation editing mode.");
      return;
    }

    const pageView = this.#getPageView(pageNumber);
    if (!pageView) {
      console.error("Page view not found for page", pageNumber);
      return;
    }

    // Wait for text layer to be fully rendered
    try {
      await this.#waitForTextLayer(pageView);
    } catch (error) {
      console.error("Failed to load text layer:", error);
      return;
    }

    // Get text layer and extract text nodes for the location
    const textLayer = pageView.textLayer.div;
    if (!textLayer) {
      console.error("Text layer div not found");
      return;
    }

    // Extract text from the location area
    const textInfo = this.#extractTextFromLocation(textLayer, pageView, location);
    if (!textInfo) {
      console.error("Could not extract text from location", location);
      return;
    }

    console.log("Extracted text info:", textInfo);

    // Create a selection programmatically
    const selection = document.getSelection();
    selection.removeAllRanges();
    const range = document.createRange();

    try {
      range.setStart(textInfo.anchorNode, textInfo.anchorOffset);
      range.setEnd(textInfo.focusNode, textInfo.focusOffset);
      selection.addRange(range);

      console.log("Selection created:", selection.toString());

      // Now use the UI manager's highlightSelection method
      setTimeout(() => {
        uiManager.highlightSelection("filter_view");
        // Clear the selection
        selection.removeAllRanges();
      }, 100);

    } catch (error) {
      console.error("Error creating selection:", error);
      selection.removeAllRanges();
    }
  }

  /**
   * Wait for text layer to be rendered
   * @param {Object} pageView - The PDF page view
   * @returns {Promise<void>}
   */
  async #waitForTextLayer(pageView) {
    // If text layer already exists and is rendered, return immediately
    if (pageView.textLayer?.div) {
      return;
    }

    // Wait for renderingState to be at least FINISHED (3)
    if (pageView.renderingState < 3) {
      await new Promise((resolve) => {
        const checkRendering = () => {
          if (pageView.renderingState >= 3) {
            resolve();
          } else {
            setTimeout(checkRendering, 50);
          }
        };
        checkRendering();
      });
    }

    // Use the textLayerPromise if available
    if (pageView.textLayer?.renderingDone) {
      await pageView.textLayer.renderingDone;
      return;
    }

    // Fallback: wait for textlayerrendered event
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Text layer rendering timeout"));
      }, 5000);

      const handler = (evt) => {
        if (evt.pageNumber === pageView.id) {
          clearTimeout(timeout);
          this.#eventBus._off("textlayerrendered", handler);
          resolve();
        }
      };

      this.#eventBus._on("textlayerrendered", handler);
    });
  }

  /**
   * Convert location coordinates to boxes format for highlight editor
   * @param {Object} pageView - The PDF page view
   * @param {Object} location - The location {x, y, width, height} in PDF coordinates
   * @returns {Array|null}
   */
  #convertLocationToBoxes(pageView, location) {
    if (!pageView.div) {
      return null;
    }

    const { x, y, width, height } = location;
    const viewport = pageView.viewport;

    // Convert PDF coordinates to viewport coordinates
    const [x1, y1] = viewport.convertToViewportPoint(x, y + height);
    const [x2, y2] = viewport.convertToViewportPoint(x + width, y);

    // Use viewport dimensions directly instead of getBoundingClientRect
    const pageWidth = viewport.width;
    const pageHeight = viewport.height;

    // Calculate normalized coordinates (0-1 range) in one pass
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);

    // Return in the format expected by the highlight editor
    return [
      {
        x: minX / pageWidth,
        y: minY / pageHeight,
        width: Math.abs(x2 - x1) / pageWidth,
        height: Math.abs(y2 - y1) / pageHeight,
      },
    ];
  }

  /**
   * Extract text and text nodes from the location area
   * @param {HTMLElement} textLayer - The text layer element
   * @param {Object} pageView - The PDF page view
   * @param {Object} location - The location {x, y, width, height} in PDF coordinates
   * @returns {Object|null}
   */
  #extractTextFromLocation(textLayer, pageView, location) {
    const { x, y, width, height } = location;
    const viewport = pageView.viewport;

    // Convert PDF coordinates to viewport coordinates
    const [x1, y1] = viewport.convertToViewportPoint(x, y + height);
    const [x2, y2] = viewport.convertToViewportPoint(x + width, y);

    const overlayLeft = Math.min(x1, x2);
    const overlayTop = Math.min(y1, y2);
    const overlayWidth = Math.abs(x2 - x1);
    const overlayHeight = Math.abs(y2 - y1);

    // Get page rect for coordinate conversion
    const pageRect = pageView.div.getBoundingClientRect();
    const textLayerRect = textLayer.getBoundingClientRect();

    // Find text elements that intersect with the location
    const textElements = textLayer.querySelectorAll("span[role='presentation']");
    let firstNode = null;
    let firstOffset = 0;
    let lastNode = null;
    let lastOffset = 0;
    let collectedText = "";

    for (const span of textElements) {
      const rect = span.getBoundingClientRect();

      // Convert to page-relative coordinates
      const spanLeft = rect.left - pageRect.left;
      const spanTop = rect.top - pageRect.top;
      const spanRight = rect.right - pageRect.left;
      const spanBottom = rect.bottom - pageRect.top;

      // Check if this text element intersects with our highlight area
      if (
        spanRight > overlayLeft &&
        spanLeft < overlayLeft + overlayWidth &&
        spanBottom > overlayTop &&
        spanTop < overlayTop + overlayHeight
      ) {
        const textNode = span.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          if (!firstNode) {
            firstNode = textNode;
            firstOffset = 0;
          }
          lastNode = textNode;
          lastOffset = textNode.textContent.length;
          collectedText += textNode.textContent;
        }
      }
    }

    if (!firstNode || !lastNode) {
      return null;
    }

    return {
      anchorNode: firstNode,
      anchorOffset: firstOffset,
      focusNode: lastNode,
      focusOffset: lastOffset,
      text: collectedText.trim(),
    };
  }

  /**
   * Get the page view for the specified page number
   * @param {number} pageNumber
   * @returns {Object|null}
   */
  #getPageView(pageNumber) {
    const pdfViewer =
      window.PDFViewerApplication?.pdfViewer ||
      window.PDFViewerApplication?.pdfSidebar?.pdfViewer;

    if (!pdfViewer || !pdfViewer._pages) {
      return null;
    }

    return pdfViewer._pages[pageNumber - 1];
  }

  /**
   * Clear the current highlight overlay
   */
  clearHighlight() {
    if (this.#currentOverlay) {
      // Remove editor or DOM element
      if (typeof this.#currentOverlay.remove === 'function') {
        this.#currentOverlay.remove();
      }
      this.#currentOverlay = null;
    }
  }
}

export { FilterHighlightOverlay };
