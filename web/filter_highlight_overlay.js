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
  
  #lastPageNumber = null;

  #highlightEditorsByPage = new Map();

  constructor(eventBus) {
    this.#eventBus = eventBus;
    this.#addEventListeners();
  }

  #addEventListeners() {
    this.#eventBus._on("filterhighlightselected", evt => {
      this.showHighlight(evt.pageNumber, evt.location, evt.id);
    });

    // Listen for UI manager initialization
    this.#eventBus._on("annotationeditoruimanager", ({ uiManager }) => {
      this.#uiManager = uiManager;
    });
  }


  storeHighlightEditorsForCurPageNum(id, pageNumber, uiManager) {
    // getEditors() is a generator function, need to convert to array
    const editorList = Array.from(uiManager.getEditors(pageNumber - 1)); // pageIndex is 0-based
    
    console.log(`DEBUG - Found ${editorList.length} editor(s) for page ${pageNumber}`);
    
    let highlightDivIds = [];
    highlightDivIds = this.#highlightEditorsByPage.get(pageNumber) || [];
    
    for (const editor of editorList) {
      // Check if this is a HighlightEditor
      if (editor && editor.constructor.name === 'HighlightEditor') {
        // Get the div ID if available
        const divId = editor.div?.id;
        if (divId) {
          // Check if this div ID is already stored to avoid duplicates
          const exists = highlightDivIds.some(item => item.highlightDivId === divId);
          if (!exists) {
            highlightDivIds.push({ textId: id, highlightDivId: divId });
          }
          console.log(`DEBUG - Found HighlightEditor with div ID:`, { textId: id, highlightDivId: divId });
        }
      }
    }
    
    // Store all highlight div IDs for this page
    if (highlightDivIds.length > 0) {
      this.#highlightEditorsByPage.set(pageNumber, highlightDivIds);
      console.log(`DEBUG - Stored ${highlightDivIds.length} highlight editor(s) for page ${pageNumber}:`, highlightDivIds);
    }
  }

  /**
   * Find highlight info by div ID
   * @param {string} divId - The highlight editor div ID
   * @returns {Object|null} - { textId, highlightDivId, pageNumber } or null if not found
   */
  findHighlightByDivId(divId) {
    for (const [pageNumber, highlights] of this.#highlightEditorsByPage.entries()) {
      const found = highlights.find(item => item.highlightDivId === divId);
      if (found) {
        return { ...found, pageNumber };
      }
    }
    return null;
  }

  /**
   * Find all highlights for a specific text ID
   * @param {string} textId - The text/filter ID
   * @returns {Array} - Array of { textId, highlightDivId, pageNumber }
   */
  findHighlightsByTextId(textId) {
    const results = [];
    for (const [pageNumber, highlights] of this.#highlightEditorsByPage.entries()) {
      const matches = highlights.filter(item => item.textId === textId);
      matches.forEach(match => results.push({ ...match, pageNumber }));
    }
    return results;
  }


  /**
   * Show a temporary highlight overlay on the specified page
   * @param {number} pageNumber - The page number (1-indexed)
   * @param {Object} location - The location coordinates {x, y, width, height}
   *                            where x, y are in PDF coordinates from stored data
   */
  async showHighlight(pageNumber, location, id) {

    // await this.clearHighlight();
    // Only clear highlights if we're on a different page to avoid DOM corruption
    // if (this.#lastPageNumber !== null) {
    //   await this.clearHighlight();
    // }

    let highlightDivIds = [];
    highlightDivIds = this.#highlightEditorsByPage.get(pageNumber) || [];
    const filteredHighlights = highlightDivIds.filter(item => item.textId === id);

    if (filteredHighlights.length > 0) {
      console.log(`DEBUG - Highlights already exist for page ${pageNumber}, textId ${id}, skipping creation.`);
      
      // reuse the existing highlightEditor to highlight the same area again
      filteredHighlights.forEach(item => {
        const uiManager = this.#uiManager || window.PDFViewerApplication?.pdfViewer?.annotationEditorUIManager;
        if (uiManager) {
          // Find editor by iterating through all editors on this page
          const editorList = Array.from(uiManager.getEditors(pageNumber - 1));
          const editor = editorList.find(e => e.div?.id === item.highlightDivId);
          if (editor) {
            console.log("DEBUG - Reusing existing highlight editor:", editor);
            
            // Make the editor active/selected
            if (editor.div) {
              // Ensure visibility
              editor.div.style.display = '';
              
              // Add selected class for active styling
              editor.div.classList.add('selectedEditor');
              
              // Trigger focus/select on the editor
              if (typeof editor.select === 'function') {
                editor.select();
              }
              
              // Set it as the selected editor in UI manager
              uiManager.setSelected(editor);
            }
          }
        }
      });

      return;
    }

    console.log(`DEBUG - No existing highlights for page ${pageNumber}, proceeding to create.`);



    this.#lastPageNumber = pageNumber;

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

    console.log("DEBUG - Text layer before extraction, total spans:", textLayer.querySelectorAll("span[role='presentation']").length);

    // Extract text from the location area
    console.log("Extracting text from location:", location);
    
    const textInfo = this.#extractTextFromLocation(textLayer, pageView, location);

    console.log("Extracting text Info:", textInfo);

    if (!textInfo) {
      console.error("Could not extract text from location", location);
      return;
    }

    // console.log("Extracted text info:", textInfo);

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
        const editor = uiManager.highlightSelection("filter_view");
        // Clear the selection
        selection.removeAllRanges();

        // Wait for editor to be registered before storing
        setTimeout(() => {
          this.storeHighlightEditorsForCurPageNum(id, pageNumber, uiManager);
        }, 50);

      }, 100);
      
      // // Store a flag to track that we have an active overlay
      // this.#currentOverlay = { temporary: true };

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

    // Get page rect for consistent coordinate conversion (same as extractTextFromLocation)
    const pageRect = pageView.div.getBoundingClientRect();
    
    // Use actual page dimensions with scaling (identical to extractTextFromLocation)
    const scaleX = pageRect.width / viewport.width || 1;
    const scaleY = pageRect.height / viewport.height || 1;
    
    const pageWidth = pageRect.width;
    const pageHeight = pageRect.height;

    // Calculate normalized coordinates (0-1 range) using viewport values
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const boxWidth = Math.abs(x2 - x1);
    const boxHeight = Math.abs(y2 - y1);

    // Return in the format expected by the highlight editor (normalized 0-1)
    return [
      {
        x: (minX * scaleX) / pageWidth,
        y: (minY * scaleY) / pageHeight,
        width: (boxWidth * scaleX) / pageWidth,
        height: (boxHeight * scaleY) / pageHeight,
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
    // Get page rect for coordinate conversion (client pixels)
    const pageRect = pageView.div.getBoundingClientRect();
    const textLayerRect = textLayer.getBoundingClientRect();

    console.log("DEBUG - pageRect:", {
      left: pageRect.left,
      top: pageRect.top,
      width: pageRect.width,
      height: pageRect.height
    });
    console.log("DEBUG - viewport:", {
      width: viewport.width,
      height: viewport.height
    });

    // Convert overlay (viewport units) into client pixels relative to page
    const scaleX = pageRect.width / viewport.width || 1;
    const scaleY = pageRect.height / viewport.height || 1;

    // Calculate overlay position in page-relative coordinates (not viewport-relative)
    const overlayPageLeft = overlayLeft * scaleX;
    const overlayPageTop = overlayTop * scaleY;
    const overlayPageRight = overlayPageLeft + overlayWidth * scaleX;
    const overlayPageBottom = overlayPageTop + overlayHeight * scaleY;

    console.log("DEBUG - overlay bounds (page-relative):", {
      left: overlayPageLeft,
      top: overlayPageTop,
      right: overlayPageRight,
      bottom: overlayPageBottom
    });

    // Find candidate text spans that intersect the overlay rect
    const textElements = Array.from(
      textLayer.querySelectorAll("span[role='presentation']")
    );

    console.log("DEBUG - total text spans:", textElements.length);

    const candidates = [];
    let debugSkipped = 0;
    for (const span of textElements) {
      const rect = span.getBoundingClientRect();
      
      // Convert span rect to page-relative coordinates (not viewport-relative)
      const spanPageLeft = rect.left - pageRect.left;
      const spanPageTop = rect.top - pageRect.top;
      const spanPageRight = rect.right - pageRect.left;
      const spanPageBottom = rect.bottom - pageRect.top;
      
      // Quick reject if no intersection in page-relative coordinates
      if (
        spanPageRight <= overlayPageLeft ||
        spanPageLeft >= overlayPageRight ||
        spanPageBottom <= overlayPageTop ||
        spanPageTop >= overlayPageBottom
      ) {
        debugSkipped++;
        continue;
      }
      const textNode = span.firstChild;
      if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
        continue;
      }
      // Store page-relative rect for consistent coordinate calculations
      candidates.push({ 
        span, 
        rect: {
          left: spanPageLeft,
          top: spanPageTop,
          right: spanPageRight,
          bottom: spanPageBottom,
          width: rect.width,
          height: rect.height
        },
        textNode 
      });
    }

    console.log("DEBUG - candidates found:", candidates.length, "skipped:", debugSkipped);
    
    if (candidates.length > 0) {
      console.log("DEBUG - first candidate:", {
        text: candidates[0].textNode.textContent.substring(0, 20),
        rect: candidates[0].rect
      });
      console.log("DEBUG - last candidate:", {
        text: candidates[candidates.length - 1].textNode.textContent.substring(0, 20),
        rect: candidates[candidates.length - 1].rect
      });
    }

    if (candidates.length === 0) {
      return null;
    }

    // Sort candidates deterministically: top then left
    candidates.sort((a, b) => {
      const topDiff = a.rect.top - b.rect.top;
      if (Math.abs(topDiff) > 1) return topDiff;
      return a.rect.left - b.rect.left;
    });

    // Compute precise character offsets for first and last spans
    const first = candidates[0];
    const last = candidates[candidates.length-1];

    const makeOffset = (candidate, overlayL, overlayR, isStart) => {
      const textLen = candidate.textNode.textContent.length || 0;
      const rectWidth = candidate.rect.width || 0;
      const rectLeft = candidate.rect.left;
      const rectRight = candidate.rect.right;
      
      if (textLen === 0 || rectWidth === 0) {
        return isStart ? 0 : textLen;
      }
      
      // Calculate how much of the span is covered by the overlay
      const coveredLeft = Math.max(rectLeft, overlayL);
      const coveredRight = Math.min(rectRight, overlayR);
      const coveredWidth = Math.max(0, coveredRight - coveredLeft);
      const coverageRatio = coveredWidth / rectWidth;
      
      if (isStart) {
        // If more than 90% is covered from the left, start at 0
        if (overlayL <= rectLeft + rectWidth * 0.1) {
          return 0;
        }
        const relStart = Math.max(0, overlayL - rectLeft);
        const startRatio = Math.max(0, Math.min(1, relStart / rectWidth));
        return Math.floor(startRatio * textLen);
      } else {
        // If more than 90% is covered to the right, use full length
        if (overlayR >= rectRight - rectWidth * 0.1) {
          return textLen;
        }
        const relEnd = Math.min(rectRight, overlayR) - rectLeft;
        const endRatio = Math.max(0, Math.min(1, relEnd / rectWidth));
        return Math.ceil(endRatio * textLen);
      }
    };

    const firstOffset = makeOffset(first, overlayPageLeft, overlayPageRight, true);
    const lastOffset = makeOffset(last, overlayPageLeft, overlayPageRight, false);

    // Build collected text by slicing candidate text nodes with computed offsets
    let collectedText = "";

    console.log("Candidates found:", candidates.length);

    for (let i = 0; i < candidates.length; i++) {
      const { textNode } = candidates[i];
      if (i === 0 && i === candidates.length - 1) {
        // Single span covers selection
        collectedText += textNode.textContent.substring(firstOffset, lastOffset);
      } else if (i === 0) {
        collectedText += textNode.textContent.substring(firstOffset);
      } else if (i === candidates.length - 1) {
        collectedText += textNode.textContent.substring(0, lastOffset);
      } else {
        collectedText += textNode.textContent;
      }
    }

    return {
      anchorNode: first.textNode,
      anchorOffset: firstOffset,
      focusNode: last.textNode,
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
  async clearHighlight() {
    if (this.#currentOverlay) {
      console.log("DEBUG - Clearing previous highlights");
      
      const uiManager = this.#uiManager || window.PDFViewerApplication?.pdfViewer?.annotationEditorUIManager;
      
      if (uiManager) {
        // Get all editors and remove any filter_view highlights
        const editors = uiManager.getEditors();
        console.log("DEBUG - Editors:", editors, "Type:", typeof editors);
        
        if (editors) {
          // Handle different return types (Map, Array, or Object)
          const editorList = editors instanceof Map ? Array.from(editors.values()) :
                            Array.isArray(editors) ? editors :
                            Object.values(editors);
          
          for (const editor of editorList) {
            // Remove all highlight editors (they modify the text layer)
            if (editor && typeof editor.remove === 'function') {
              try {
                console.log("DEBUG - Removing editor:", editor);
                editor.remove();
              } catch (e) {
                console.warn("Error removing editor:", e);
              }
            }
          }
        }
      }
      
      this.#currentOverlay = null;
      
      // Wait a bit for DOM cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

export { FilterHighlightOverlay };
