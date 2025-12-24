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

import { PDFFilterView } from "./pdf_filter_view.js";

/**
 * @typedef {Object} PDFFilterViewerOptions
 * @property {HTMLDivElement} container - The container for the filter view.
 * @property {EventBus} eventBus - The application event bus.
 * @property {IPDFLinkService} linkService - The navigation/linking service.
 */

class PDFFilterViewer {
  #container = null;

  #eventBus = null;

  #linkService = null;

  #highlightsData = null;

  #filterItems = [];

  #isViewerEmbedded = false;

  /**
   * @param {PDFFilterViewerOptions} options
   */
  constructor({ container, eventBus, linkService }) {
    this.#container = container;
    this.#eventBus = eventBus;
    this.#linkService = linkService;
    this.#isViewerEmbedded = window.parent !== window;

    // Listen for highlights data from parent window
    this.#setupMessageListeners();
  }

  /**
   * Setup message listeners for receiving highlights from parent window
   */
  #setupMessageListeners() {
    // Listen for postMessage from parent window
    window.addEventListener(
      "message",
      event => {
        if (
          event.data &&
          event.data.type === "pdfjs-highlights" &&
          event.data.source === "pdf.js-client"
        ) {
          console.log("Received highlights from parent window:", event.data.data);
          this.setHighlights(event.data.data);
        }
      },
      false
    );

    // Listen for custom event (same-origin)
    document.addEventListener(
      "pdfhighlightsdatareceived",
      event => {
        console.log("Received highlights via custom event:", event.detail);
        this.setHighlights(event.detail);
      },
      false
    );
  }

  /**
   * Set highlights data directly
   * @param {Array} highlightsData - Array of highlight objects
   */
  setHighlights(highlightsData) {
    if (!Array.isArray(highlightsData)) {
      console.error("Invalid highlights data: must be an array");
      return;
    }

    this.#highlightsData = highlightsData;
    this.#render();
  }

  /**
   * Load and display highlights - supports multiple sources
   * @param {Array} externalData - Optional highlights data passed directly
   */
  async loadHighlights(externalData = null) {
    try {
      // Priority 1: Use externally provided data
      if (externalData && Array.isArray(externalData)) {
        this.#highlightsData = externalData;
        this.#render();
        return;
      }

      // Priority 2: Request data from parent window if embedded
      if (this.#isViewerEmbedded) {
        this.#requestHighlightsFromParent();
        // Wait a bit for response, then try fallback
        await new Promise(resolve => setTimeout(resolve, 500));
        if (this.#highlightsData) {
          return;
        }
      }

      // Priority 3: Fallback to loading from highlights.json file
      const response = await fetch("config/highlights.json");
      if (!response.ok) {
        throw new Error(`Failed to load highlights: ${response.statusText}`);
      }

      this.#highlightsData = await response.json();
      this.#render();
    } catch (error) {
      console.error("Error loading highlights:", error);
      this.#renderError(error.message);
    }
  }

  /**
   * Request highlights data from parent window
   */
  #requestHighlightsFromParent() {
    if (!this.#isViewerEmbedded) {
      return;
    }

    try {
      // Send request to parent for highlights
      window.parent.postMessage(
        {
          type: "pdfjs-request-highlights",
          source: "pdf.js",
        },
        "*" // In production, replace with specific origin
      );
      console.log("Requested highlights from parent window");
    } catch (error) {
      console.error("Error requesting highlights from parent:", error);
    }
  }

  /**
   * Render the highlights in the container
   */
  #render() {
    // Clear existing content and filter items
    this.#container.textContent = "";
    this.#filterItems.forEach(item => item.destroy());
    this.#filterItems = [];

    if (!this.#highlightsData || this.#highlightsData.length === 0) {
      this.#container.innerHTML = `
        <div class="filterMessage">
          <p>No highlights found.</p>
        </div>
      `;
      return;
    }

    // Create PDFFilterView items similar to thumbnails
    this.#highlightsData.forEach((highlight, index) => {
      const filterView = new PDFFilterView({
        container: this.#container,
        eventBus: this.#eventBus,
        id: index + 1,
        highlightData: highlight,
        linkService: this.#linkService,
      });
      this.#filterItems.push(filterView);
    });
  }

  /**
   * Render an error message
   * @param {string} message - The error message to display
   */
  #renderError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "filterError";
    const errorMsg = document.createElement("p");
    errorMsg.textContent = `Error: ${message}`;
    errorDiv.append(errorMsg);
    this.#container.append(errorDiv);
  }

  /**
   * Reset the filter view
   */
  reset() {
    this.#highlightsData = null;
    this.#filterItems.forEach(item => item.destroy());
    this.#filterItems = [];
    this.#container.textContent = "";
  }
}

export { PDFFilterViewer };
