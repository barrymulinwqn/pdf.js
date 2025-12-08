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
/** @typedef {import("./interfaces").IPDFLinkService} IPDFLinkService */

const FILTER_WIDTH = 98; // px - same as THUMBNAIL_WIDTH

/**
 * @typedef {Object} PDFFilterViewOptions
 * @property {HTMLDivElement} container - The viewer element.
 * @property {EventBus} eventBus - The application event bus.
 * @property {number} id - The filter item's unique ID.
 * @property {Object} highlightData - The highlight data containing page,
 *   text, and location.
 * @property {IPDFLinkService} linkService - The navigation/linking service.
 */

/**
 * Individual filter view item that displays highlight content
 * with the same visual format as thumbnails
 */
class PDFFilterView {
  /**
   * @param {PDFFilterViewOptions} options
   */
  constructor({ container, eventBus, id, highlightData, linkService }) {
    this.id = id;
    this.highlightData = highlightData;
    this.eventBus = eventBus;
    this.linkService = linkService;

    // Create anchor element for navigation
    const anchor = document.createElement("a");
    anchor.href = linkService.getAnchorUrl(`#page=${highlightData.page}`);
    anchor.setAttribute("data-l10n-id", "pdfjs-filter-item-title");
    anchor.onclick = () => {
      // Navigate to the page and highlight the specific location
      this.#navigateToHighlight();
      return false;
    };
    this.anchor = anchor;

    // Create container div with thumbnail-like styling
    const div = document.createElement("div");
    div.className = "thumbnail"; // Reuse thumbnail class for consistent styling
    div.setAttribute("data-page-number", highlightData.page);
    div.setAttribute("data-filter-id", id);
    this.div = div;

    // Set dimensions similar to thumbnails
    this.#updateDims();

    // Create content container
    const contentDiv = document.createElement("div");
    contentDiv.className = "filterItemContent";

    // Add page number header
    const pageHeader = document.createElement("div");
    pageHeader.className = "filterItemHeader";
    pageHeader.textContent = `Page ${highlightData.page}`;

    // Add text content
    const textContent = document.createElement("div");
    textContent.className = "filterItemText";
    textContent.textContent = highlightData.text;

    contentDiv.append(pageHeader, textContent);
    div.append(contentDiv);
    anchor.append(div);
    container.append(anchor);
  }

  #navigateToHighlight() {
    const { page, location } = this.highlightData;

    // Get the PDF viewer from the link service
    const pdfViewer = this.linkService.pdfViewer;

    if (!pdfViewer) {
      // Fallback to simple page navigation
      this.linkService.goToPage(page);
      return;
    }

    // location array format: [x, y, width, height]
    if (location && Array.isArray(location) && location.length === 4) {
      const [x, y, width, height] = location;
      // In highlights.json: y and height are negative (PDF coordinate system)
      // y is the distance from bottom, height is negative going upward
      const top = y + height; // top of the highlight area
      const bottom = y; // bottom of the highlight area

      // Calculate center point of the highlight
      const centerX = x + width / 2;
      const centerY = (top + bottom) / 2;

      // Use XYZ destination to preserve current zoom level
      // Format: [pageRef, /XYZ, left, top, zoom]
      // zoom = null preserves current scale
      // center: 'both' positions the highlight in the middle of the screen
      pdfViewer.scrollPageIntoView({
        pageNumber: page,
        destArray: [null, { name: "XYZ" }, centerX, centerY, null],
        allowNegativeOffset: true,
        center: "both",
      });

      // Dispatch event to draw temporary highlight overlay
      this.eventBus.dispatch("filterhighlightselected", {
        source: this,
        pageNumber: page,
        location: { x, y, width, height },
      });
    } else {
      // Fallback if location data is not available
      this.linkService.goToPage(page);
    }
  }

  #updateDims() {
    const { style } = this.div;
    // Use fixed dimensions similar to thumbnails
    // Height will be auto-adjusted based on text content
    style.setProperty("--thumbnail-width", `${FILTER_WIDTH}px`);
    style.setProperty("--thumbnail-height", "auto");
  }

  /**
   * Get the page number associated with this filter item
   */
  get pageNumber() {
    return this.highlightData.page;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.anchor?.remove();
  }
}

export { PDFFilterView };
