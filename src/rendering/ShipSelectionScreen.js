/**
 * ShipSelectionScreen - shows the available ship types with their
 * characteristics and highlights the currently selected option
 * (PLAYER SHIP SELECTION, PLAYER SHIP TYPE REGULAR/SLOW, UC-007).
 */
export class ShipSelectionScreen {
  constructor(element) {
    this.element = element;
  }

  /**
   * @param {Array<{type:string,label:string,description:string}>} options
   * @param {number} selectedIndex
   */
  render(options, selectedIndex) {
    this.element.innerHTML = options
      .map(
        (option, index) =>
          `<div class="option${index === selectedIndex ? ' selected' : ''}">${option.label} — ${option.description}</div>`
      )
      .join('');
  }

  show() {
    this.element.classList.add('show');
  }

  hide() {
    this.element.classList.remove('show');
  }
}
