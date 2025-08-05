import { LitElement, html, css } from 'lit';

class InformeFecha extends LitElement {
  static properties = {
    loginData: { type: Object },
    pdfUrls: { type: Object },
    fechaInicial: { type: String },
    fechaFinal: { type: String }
  };

  static styles = css`
    pre {
      background: #f0f0f0;
      padding: 10px;
      border-radius: 4px;
      max-width: 100%;
      overflow-x: auto;
      margin-bottom: 15px;
    }
    .loading {
      font-style: italic;
      color: gray;
    }
    form {
      max-width: 400px;
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: center;
    }
    label {
      font-weight: bold;
    }
    input[type="date"] {
      padding: 5px;
    }
    button {
      padding: 6px 12px;
      cursor: pointer;
    }
  `;

  constructor() {
    super();
    this.loginData = null;
    this.pdfUrls = {};
    this.fechaInicial = '2024-01-01';
    this.fechaFinal = '2025-12-31';
  }

  updated(changedProps) {
    if (changedProps.has('loginData') && this.loginData) {
      this.fetchReportUrls();
    }
  }

  handleFechaChange(e) {
    this[e.target.name] = e.target.value;
  }

  async fetchReportUrls() {
    if (!this.loginData) return;

    const institucionId = this.loginData.institucion.id_institucion;
    const idUser = this.loginData.usuario.id_usuario;

    const reportes = [
      'ListadoHistoriasAsistencialesDestallado',
      'ListadoAsistencialHojaAdministracionMedicamentos',
      'ListadoAsistencialHojaAdministracionProcedimientos'
    ];

    const promises = reportes.map(async (reporte) => {
      const url = `http://localhost:3000/informe?institucionId=${institucionId}&idUser=${idUser}&fechaInicial=${this.fechaInicial}&fechaFinal=${this.fechaFinal}&auditoria=1&reporte=${reporte}`;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error al obtener ${reporte}`);
        const data = await response.json();
        return { reporte, url: data.pdfUrl || 'No se recibió pdfUrl' };
      } catch (error) {
        return { reporte, url: `Error: ${error.message}` };
      }
    });

    const results = await Promise.all(promises);
    const newPdfUrls = {};
    results.forEach(({ reporte, url }) => {
      newPdfUrls[reporte] = url;
    });

    this.pdfUrls = newPdfUrls;
  }

  render() {
    if (!this.loginData) {
      return html`<p>⚠️ No hay datos de login disponibles.</p>`;
    }

    const reportes = [
      'ListadoHistoriasAsistencialesDestallado',
      'ListadoAsistencialHojaAdministracionMedicamentos',
      'ListadoAsistencialHojaAdministracionProcedimientos'
    ];

    return html`
      <form @submit=${e => {
        e.preventDefault();
        this.fetchReportUrls();
      }}>
        <label for="fechaInicial">Fecha Inicial:</label>
        <input
          type="date"
          id="fechaInicial"
          name="fechaInicial"
          .value=${this.fechaInicial}
          @change=${this.handleFechaChange}
          required
        />

        <label for="fechaFinal">Fecha Final:</label>
        <input
          type="date"
          id="fechaFinal"
          name="fechaFinal"
          .value=${this.fechaFinal}
          @change=${this.handleFechaChange}
          required
        />

        <button type="submit">Actualizar reportes</button>
      </form>

      <h3>Reportes PDF generados:</h3>
      <ul>
        ${reportes.map(reporte => html`
          <li>
            <strong>${reporte}:</strong>
            ${this.pdfUrls[reporte]
              ? html`<a href="${this.pdfUrls[reporte]}" target="_blank" rel="noopener noreferrer">${this.pdfUrls[reporte]}</a>`
              : html`<span class="loading">Cargando...</span>`}
          </li>
        `)}
      </ul>
    `;
  }
}

customElements.define('informe-fecha', InformeFecha);
