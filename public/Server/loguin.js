import { LitElement, html, css } from 'lit';
import './Main.js';



class loguin extends LitElement {
  static properties = {
    username: { type: String },
    password: { type: String },
    errorMessage: { type: String },
    loginData: { type: Object },
    loading: { type: Boolean }
  };

  constructor() {
    super();
    this.username = '';
    this.password = '';
    this.errorMessage = '';
    this.loginData = null;
    this.loading = false;
  }

  handleInput(e) {
    const { name, value } = e.target;
    if (name in this) this[name] = value;
  }

  async handleSubmit(e) {
    e.preventDefault();
    this.errorMessage = '';
    this.loginData = null;
    this.loading = true;

    try {
      const response = await fetch('http://localhost:3000/api/istitucion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.username, password: this.password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login fallido');
      }

      const data = await response.json();
      this.loginData = data;
      console.log('Datos de login recibidos:', data);

    } catch (err) {
      this.errorMessage = err.message || 'Login incorrecto o error del servidor';
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  renderLoginData() {
    if (!this.loginData) return null;

    const { usuario } = this.loginData;

    return html`
      <div class="result">
        Login exitoso. ¡Bienvenido, ${usuario.nombre}!
      </div>
    `;
  }

  static styles = css`
    form {
      display: flex;
      flex-direction: column;
      max-width: 300px;
      margin: auto;
    }
    input, button {
      margin: 8px 0;
      padding: 8px;
    }
    .error {
      color: red;
      text-align: center;
    }
    .result {
      margin-top: 20px;
      font-size: 16px;
      background: #f0f0f0;
      padding: 10px;
      border-radius: 4px;
      text-align: center;
      font-weight: bold;
    }
    button[disabled] {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;

  render() {
    return html`
      <form @submit=${this.handleSubmit}>
        <label for="username">Usuario:</label>
        <input
          id="username"
          name="username"
          type="text"
          .value=${this.username}
          @input=${this.handleInput}
          required
        />

        <label for="password">Contraseña:</label>
        <input
          id="password"
          name="password"
          type="password"
          .value=${this.password}
          @input=${this.handleInput}
          required
        />

        <button type="submit" ?disabled=${this.loading}>
          ${this.loading ? 'Cargando...' : 'Iniciar sesión'}
        </button>

        ${this.errorMessage ? html`<div class="error">${this.errorMessage}</div>` : ''}
      </form>

      ${this.renderLoginData()}

      <!-- Aquí pasas la info a link-url si usas ese componente -->
      <main-p .loginData=${this.loginData}></main-p>
    `;
  }
}

customElements.define('loguin-main', loguin);
