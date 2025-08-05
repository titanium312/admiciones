import { LitElement, html, css } from 'lit';
import './documento-admicion.js';  // Adjust the path & filename if needed
import "./Informe.js"
class main extends LitElement {
  static properties = {
    loginData: { type: Object }
  };

  static styles = css`
    pre {
      background: #e0e0e0;
      padding: 10px;
      border-radius: 4px;
      max-width: 400px;
      margin: 20px auto;
      white-space: pre-wrap;
    }
  `;

  constructor() {
    super();
    this.loginData = null;
  }

  render() {
    return html`
      <h3>Datos recibidos en link-url:</h3>
      <descargar-archivos .loginData=${this.loginData}></documento-admicion>

    `;
  }
}

customElements.define('main-p', main);
