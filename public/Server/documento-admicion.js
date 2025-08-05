import { LitElement, html, css } from 'lit';

class DescargarArchivos extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    button {
      padding: 10px 16px;
      margin: 10px 5px 10px 0;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #0056b3;
    }
    button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    .factura-btn {
      background-color: #28a745;
    }
    .factura-btn:hover {
      background-color: #218838;
    }
    pre {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
    }
    .status {
      margin: 15px 0;
      padding: 10px;
      border-radius: 4px;
    }
    .success {
      background-color: #d4edda;
      color: #155724;
    }
    .error {
      background-color: #f8d7da;
      color: #721c24;
    }
    .facturas-container {
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .factura-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      margin: 5px 0;
      background: white;
      border-radius: 4px;
    }
    .login-data {
      background: #e9ecef;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .button-group {
      margin: 15px 0;
    }
  `;

  static properties = {
    carpeta: { type: String },
    admisionesData: { type: Object },
    isLoading: { type: Boolean },
    status: { type: String },
    isError: { type: Boolean },
    facturas: { type: Array },
    loginData: { type: Object }
  };

  constructor() {
    super();
    this.carpeta = 'descarga+idusuaro';
    this.admisionesData = null;
    this.isLoading = false;
    this.status = '';
    this.isError = false;
    this.facturas = [];
    this.loginData = {};
  }

  async obtenerAdmisiones() {
    this.isLoading = true;
    this.status = 'Obteniendo datos de admisiones...';
    this.isError = false;
    this.facturas = [];
    this.requestUpdate();

    try {
      const response = await fetch('http://localhost:3000/api/admisiones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id_institucion: this.loginData.institucion.id_institucion,
          numeros_admision: [7035]
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      this.admisionesData = await response.json();
      this.status = 'Datos obtenidos correctamente';
      
      if (this.admisionesData?.resultados) {
        const admision = Object.values(this.admisionesData.resultados)[0];
        if (admision.facturas?.length) {
          this.facturas = admision.facturas;
        }
      }
      
      console.log('Datos recibidos:', this.admisionesData);
    } catch (error) {
      console.error('Error:', error);
      this.status = `Error: ${error.message}`;
      this.isError = true;
    } finally {
      this.isLoading = false;
      this.requestUpdate();
    }
  }

  async descargarTodo() {
    if (!this.admisionesData?.resultados) {
      this.status = 'Primero debes obtener los datos de admisiones';
      this.isError = true;
      this.requestUpdate();
      return;
    }

    this.isLoading = true;
    this.status = 'Preparando descarga...';
    this.isError = false;
    this.requestUpdate();

    try {
      const admision = Object.values(this.admisionesData.resultados)[0];
      
      const params = new URLSearchParams({
        institucionId: this.loginData.institucion.id_institucion,
        idUser: this.loginData.usuario.id_usuario,
        nombreCarpeta: this.carpeta,
        ...(admision.id_historia && { idsHistorias: admision.id_historia }),
        ...(admision.evoluciones?.length && { idsEvoluciones: admision.evoluciones.join(',') }),
        ...(admision.notas_enfermeria?.length && { idsNotasEnfermeria: admision.notas_enfermeria.join(',') }),
        ...(admision.ordenes_medicas?.length && { idsOrdenMedicas: admision.ordenes_medicas.join(',') }),
        ...(admision.id_admision && { idsAdmisiones: admision.id_admision }),
        ...(admision.id_egreso?.length && { idEgresos: admision.id_egreso.join(',') }),
        ...(admision.anexo2?.length && { idAnexosDos: admision.anexo2.join(',') }),
        ...(admision.facturas?.length && { idFacturas: admision.facturas.join(',') })
      });

      const url = `http://localhost:3000/Hs_Anx?${params.toString()}`;
      console.log('URL de descarga:', url);

      window.open(url, '_blank');
      this.status = 'Descarga iniciada. Revisa tu navegador.';
      
      setTimeout(() => {
        window.open('http://localhost:3000/descargar', '_blank');
      }, 2000);
      
    } catch (error) {
      console.error('Error al descargar:', error);
      this.status = `Error al descargar: ${error.message}`;
      this.isError = true;
    } finally {
      this.isLoading = false;
      this.requestUpdate();
    }
  }

  descargarFactura(idFactura) {
    const params = new URLSearchParams({
      idFactura: idFactura,
      nombreArchiv: `Factura_${idFactura}`,
      nombreCarpeta: this.carpeta
    }).toString();
    
    window.open(`http://localhost:3000/descargar-archivo?${params}`, '_blank');
  }

  render() {
    return html`
      <h1>Descargar Archivos</h1>

      ${this.loginData && Object.keys(this.loginData).length > 0 ? html`
        <div class="login-data">
          <h3>Datos de Usuario:</h3>
          <p><strong>Nombre:</strong> ${this.loginData.usuario?.nombre}</p>
          <p><strong>Institución:</strong> ${this.loginData.institucion?.nombre_institucion}</p>
          <pre>${JSON.stringify(this.loginData, null, 2)}</pre>
        </div>
      ` : ''}

      <div class="button-group">
        <button @click=${this.obtenerAdmisiones} ?disabled=${this.isLoading}>
          Obtener Datos de Admisión
        </button>
        <button @click=${this.descargarTodo} ?disabled=${this.isLoading || !this.admisionesData}>
          Descargar Todo
        </button>
      </div>

      ${this.status ? html`
        <div class="status ${this.isError ? 'error' : 'success'}">
          ${this.status}
        </div>
      ` : ''}

      ${this.admisionesData ? html`
        <h3>Datos Obtenidos:</h3>
        <pre>${JSON.stringify(this.admisionesData, null, 2)}</pre>
      ` : ''}

      ${this.facturas.length > 0 ? html`
        <div class="facturas-container">
          <h3>Facturas Disponibles</h3>
          ${this.facturas.map(factura => html`
            <div class="factura-item">
              <span>Factura ID: ${factura}</span>
              <button class="factura-btn" @click=${() => this.descargarFactura(factura)}>
                Descargar
              </button>
            </div>
          `)}
        </div>
      ` : ''}
    `;
  }
}

customElements.define('descargar-archivos', DescargarArchivos);