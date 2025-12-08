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

  /**
   * @param {PDFFilterViewerOptions} options
   */
  constructor({ container, eventBus, linkService }) {
    this.#container = container;
    this.#eventBus = eventBus;
    this.#linkService = linkService;
  }

  /**
   * Load and display highlights from the highlights.json file
   */
  async loadHighlights() {
    try {
      // Fetch the highlights.json file
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
