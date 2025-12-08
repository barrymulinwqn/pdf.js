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

  constructor(eventBus) {
    this.#eventBus = eventBus;
    this.#addEventListeners();
  }

  #addEventListeners() {
    this.#eventBus._on("filterhighlightselected", evt => {
      this.showHighlight(evt.pageNumber, evt.location);
    });
  }

  /**
   * Show a temporary highlight overlay on the specified page
   * @param {number} pageNumber - The page number (1-indexed)
   * @param {Object} location - The location coordinates {x, y, width, height}
   */
  showHighlight(pageNumber, location) {
    // Clear any existing highlight
    this.clearHighlight();

    // Wait a bit for the page to be rendered and positioned
    setTimeout(() => {
      const pageView = this.#getPageView(pageNumber);
      if (!pageView) {
        return;
      }

      const overlay = this.#createOverlayElement(pageView, location);
      if (overlay) {
        this.#currentOverlay = overlay;
      }
    }, 500);
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
   * Create the highlight overlay element
   * @param {Object} pageView - The PDF page view
   * @param {Object} location - The location {x, y, width, height}
   * @returns {HTMLElement|null}
   */
  #createOverlayElement(pageView, location) {
    if (!pageView.div) {
      return null;
    }

    const { x, y, width, height } = location;
    const viewport = pageView.viewport;

    // Convert PDF coordinates to viewport coordinates
    // In highlights.json: location = [x, y, width, height]
    // where y and height are negative (PDF bottom-left origin)
    // We need to calculate the actual bottom and top positions
    const left = x;
    const bottom = y; // y is already negative, representing distance from bottom
    const right = x + width;
    const top = y + height; // height is negative, so this gives us the top

    // Convert PDF points to viewport coordinates
    const topLeft = viewport.convertToViewportPoint(left, top);
    const bottomRight = viewport.convertToViewportPoint(right, bottom);

    const overlay = document.createElement("div");
    overlay.className = "filterHighlightOverlay";
    overlay.style.position = "absolute";
    overlay.style.left = `${Math.min(topLeft[0], bottomRight[0])}px`;
    overlay.style.top = `${Math.min(topLeft[1], bottomRight[1])}px`;
    overlay.style.width = `${Math.abs(bottomRight[0] - topLeft[0])}px`;
    overlay.style.height = `${Math.abs(bottomRight[1] - topLeft[1])}px`;
    overlay.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
    overlay.style.border = "2px solid rgba(255, 200, 0, 0.8)";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "1000";
    overlay.style.transition = "opacity 0.3s ease-in-out";

    pageView.div.append(overlay);

    // Fade in animation
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
    });

    return overlay;
  }

  /**
   * Clear the current highlight overlay
   */
  clearHighlight() {
    if (this.#currentOverlay) {
      // Fade out before removing
      this.#currentOverlay.style.opacity = "0";
      setTimeout(() => {
        this.#currentOverlay?.remove();
        this.#currentOverlay = null;
      }, 300);
    }
  }
}

export { FilterHighlightOverlay };
