import { LitElement, html, css } from 'lit';

class MiComponente extends LitElement {

  static styles = css`
    :host {
      display: block;
      padding: 16px;
      color: var(--mi-componente-text-color, black);
    }
  `;

  render() {
    return html`
      <div>
        <h1>Hola Mundo</h1>
      </div>
    `;
  }
}

customElements.define('mi-componente', MiComponente);
