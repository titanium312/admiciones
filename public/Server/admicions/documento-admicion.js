import { LitElement, html, css } from 'lit';

class DescargarArchivos extends LitElement {
  static styles = css`
    :host {
      display: block;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    
    textarea, select {
      width: 100%;
      padding: 8px;
      margin-top: 5px;
      margin-bottom: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    button {
      padding: 10px 20px;
      background-color: #0078d4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      transition: background-color 0.3s;
    }
    
    button:hover {
      background-color: #106ebe;
    }
    
    button:disabled {
      background-color: #888;
      cursor: not-allowed;
    }
    
    .status {
      margin-top: 15px;
      padding: 12px;
      border-radius: 4px;
      border-left: 4px solid;
    }
    
    .status.success {
      background-color: #f0fff4;
      border-color: #38a169;
      color: #2f855a;
    }
    
    .status.error {
      background-color: #fff5f5;
      border-color: #c53030;
      color: #c53030;
    }
    
    .status.info {
      background-color: #ebf8ff;
      border-color: #3182ce;
      color: #2c5282;
    }
    
    .status.warning {
      background-color: #fffaf0;
      border-color: #dd6b20;
      color: #c05621;
    }
    
    .tipo-docs {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
      margin: 15px 0;
    }
    
    .tipo-docs label {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      background-color: #f8f9fa;
    }
    
    .tipo-docs label:hover {
      background-color: #e9ecef;
    }
    
    .tipo-docs input {
      margin-right: 8px;
    }
    
    .progress-container {
      margin-top: 15px;
      background-color: #e9ecef;
      border-radius: 4px;
      height: 10px;
    }
    
    .progress-bar {
      height: 100%;
      border-radius: 4px;
      background-color: #0078d4;
      transition: width 0.3s ease;
    }
    
    .resultados-descarga {
      margin-top: 20px;
      border: 1px solid #eee;
      border-radius: 4px;
      padding: 10px;
      max-height: 400px;
      overflow-y: auto;
    }
    
    .resultado-item {
      padding: 8px;
      border-bottom: 1px solid #eee;
    }
    
    .resultado-item:last-child {
      border-bottom: none;
    }
    
    .resultado-item.success {
      background-color: #f0fff4;
    }
    
    .resultado-item.error {
      background-color: #fff5f5;
    }
    
    .resultado-item.warning {
      background-color: #fffaf0;
    }
    
    .summary {
      margin-top: 15px;
      font-weight: bold;
      padding: 10px;
      background-color: #f8f9fa;
      border-radius: 4px;
    }
    
    .retry-btn {
      margin-left: 10px;
      padding: 2px 8px;
      font-size: 12px;
      background-color: #e53e3e;
    }
    
    .retry-btn:hover {
      background-color: #c53030;
    }
  `;

  static properties = {
    isLoading: { type: Boolean },
    status: { type: String },
    statusType: { type: String }, // 'success', 'error', 'warning', 'info'
    loginData: { type: Object },
    multipleAdmisiones: { type: String },
    epsSeleccionada: { type: String },
    tiposSeleccionados: { type: Array },
    directorioDestino: { type: String },
    progress: { type: Number },
    totalAdmisiones: { type: Number },
    resultadosDescarga: { type: Array },
    admisionesConError: { type: Array },
    showOnlyErrors: { type: Boolean }
  };

  constructor() {
    super();
    this.isLoading = false;
    this.status = '';
    this.statusType = 'info';
    this.loginData = {
      institucion: { id_institucion: 20 },
      usuario: { id_usuario: 6874 }
    };
    this.multipleAdmisiones = '';
    this.epsSeleccionada = '';
    this.tiposSeleccionados = [];
    this.directorioDestino = '';
    this.progress = 0;
    this.totalAdmisiones = 0;
    this.resultadosDescarga = [];
    this.admisionesConError = [];
    this.showOnlyErrors = false;
  }

  toggleTipoSeleccionado(tipo) {
    if (this.tiposSeleccionados.includes(tipo)) {
      this.tiposSeleccionados = this.tiposSeleccionados.filter(t => t !== tipo);
    } else {
      this.tiposSeleccionados = [...this.tiposSeleccionados, tipo];
    }
  }

  async fetchWithRetry(url, options, retries = 3, delay = 1000) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        // Si es error 400 o 500, intentamos de nuevo
        if (response.status >= 400 && retries > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.fetchWithRetry(url, options, retries - 1, delay * 1.5);
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response;
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retries - 1, delay * 1.5);
      }
      throw error;
    }
  }

  async obtenerIdsDocumentos(numeroAdmision) {
    try {
      const body = {
        id_institucion: this.loginData.institucion.id_institucion,
        numeros_admision: [parseInt(numeroAdmision, 10)]
      };

      const resp = await this.fetchWithRetry('http://localhost:3000/api/admisiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await resp.json();
      
      if (!data.resultados || !data.resultados[numeroAdmision]) {
        throw new Error(`No se encontraron datos para la admisión ${numeroAdmision}`);
      }

      return data.resultados[numeroAdmision];
    } catch (error) {
      console.error(`Error obteniendo IDs para admisión ${numeroAdmision}:`, error);
      throw new Error(`No se pudieron obtener los IDs: ${error.message.replace(/^❌\s*/, '')}`);
    }
  }

  async descargarArchivoIndividual(params, tipo) {
    try {
      // Validación mejorada de parámetros
      const requiredParams = {
        'Factura': ['idFactura', 'institucionId', 'idUser', 'eps', 'idAdmision'],
        'Anexo 2': ['idAdmision', 'institucionId', 'idUser', 'eps', 'idAnexosDos'],
        'default': ['institucionId', 'idUser', 'eps', 'idAdmision']
      };
      
      const paramsRequeridos = requiredParams[tipo] || requiredParams.default;
      const missingParams = paramsRequeridos.filter(p => !params[p]);
      
      if (missingParams.length > 0) {
        throw new Error(`Faltan parámetros requeridos: ${missingParams.join(', ')}`);
      }

      const endpoint = tipo === 'Factura' ? 'descargar-archivo' : 'Hs_Anx';
      const queryParams = new URLSearchParams(params);
      const response = await this.fetchWithRetry(
        `http://localhost:3000/${endpoint}?${queryParams.toString()}`
      );

      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        const blob = await response.blob();
        const filename = tipo === 'Factura' 
          ? `factura_${params.idFactura}.zip` 
          : `${tipo.toLowerCase().replace(/ /g, '_')}_${params.idAdmision}.pdf`;
        
        return {
          success: true,
          mensaje: 'Archivo descargado correctamente',
          archivo: filename,
          nombreArchivo: filename,
          tipo,
          id: params.idFactura || params.idAdmision
        };
      }
      
      if (data.error || data.mensaje?.includes('❌')) {
        throw new Error(data.error || data.mensaje);
      }

      return {
        success: true,
        ...data,
        tipo,
        id: params.idFactura || params.idAdmision
      };
    } catch (error) {
      console.error(`Error descargando ${tipo}:`, error);
      return {
        success: false,
        mensaje: error.message,
        tipo,
        id: params.idFactura || params.idAdmision,
        error: true
      };
    }
  }

  obtenerIdsPorTipo(idsData, tipo) {
    switch(tipo) {
      case 'Historia Clínica': return idsData.id_historia ? [idsData.id_historia] : [];
      case 'Evolución': return idsData.evoluciones || [];
      case 'Nota de Enfermería': return idsData.notas_enfermeria || [];
      case 'Orden Médica': return idsData.ordenes_medicas || [];
      case 'Egreso': return idsData.id_egreso ? [idsData.id_egreso] : [];
      case 'Anexo 2': return idsData.anexo2 ? [idsData.anexo2] : [];
      case 'Factura': return idsData.facturas || [];
      case 'Admisión': return idsData.id_admision ? [idsData.id_admision] : [];
      default: return [];
    }
  }

  async descargarDocumentosParaAdmision(numeroAdmision) {
    const tiposMapping = {
      'Historia Clínica': { 
        tipo: 'idsHistorias', 
        endpoint: 'Hs_Anx',
        params: (id, admisionId) => ({
          idAdmision: admisionId,
          institucionId: this.loginData.institucion.id_institucion,
          idUser: this.loginData.usuario.id_usuario,
          eps: this.epsSeleccionada,
          idsHistorias: id
        })
      },
      'Evolución': { 
        tipo: 'idsEvoluciones', 
        endpoint: 'Hs_Anx',
        params: (id, admisionId) => ({
          idAdmision: admisionId,
          institucionId: this.loginData.institucion.id_institucion,
          idUser: this.loginData.usuario.id_usuario,
          eps: this.epsSeleccionada,
          idsEvoluciones: id
        })
      },
      'Nota de Enfermería': { 
        tipo: 'idsNotasEnfermeria', 
        endpoint: 'Hs_Anx',
        params: (id, admisionId) => ({
          idAdmision: admisionId,
          institucionId: this.loginData.institucion.id_institucion,
          idUser: this.loginData.usuario.id_usuario,
          eps: this.epsSeleccionada,
          idsNotasEnfermeria: id
        })
      },
      'Orden Médica': { 
        tipo: 'idsOrdenMedicas', 
        endpoint: 'Hs_Anx',
        params: (id, admisionId) => ({
          idAdmision: admisionId,
          institucionId: this.loginData.institucion.id_institucion,
          idUser: this.loginData.usuario.id_usuario,
          eps: this.epsSeleccionada,
          idsOrdenMedicas: id
        })
      },
      'Admisión': { 
        tipo: 'idAdmisiones', 
        endpoint: 'Hs_Anx',
        params: (id, admisionId) => ({
          idAdmision: admisionId,
          institucionId: this.loginData.institucion.id_institucion,
          idUser: this.loginData.usuario.id_usuario,
          eps: this.epsSeleccionada,
          idAdmisiones: id
        })
      },
      'Egreso': { 
        tipo: 'idEgresos', 
        endpoint: 'Hs_Anx',
        params: (id, admisionId) => ({
          idAdmision: admisionId,
          institucionId: this.loginData.institucion.id_institucion,
          idUser: this.loginData.usuario.id_usuario,
          eps: this.epsSeleccionada,
          idEgresos: id
        })
      },
      'Anexo 2': { 
        tipo: 'idAnexosDos', 
        endpoint: 'Hs_Anx',
        params: (id, admisionId) => ({
          idAdmision: admisionId,
          institucionId: this.loginData.institucion.id_institucion,
          idUser: this.loginData.usuario.id_usuario,
          eps: this.epsSeleccionada,
          idAnexosDos: id
        })
      },
      'Factura': { 
        tipo: 'idFacturas', 
        endpoint: 'descargar-archivo',
        params: (id, admisionId) => ({
          idFactura: id,
          nombreArchivo: `factura_${id}`,
          institucionId: this.loginData.institucion.id_institucion,
          idUser: this.loginData.usuario.id_usuario,
          eps: this.epsSeleccionada,
          idAdmision: admisionId
        })
      }
    };

    const resultados = [];
    let idsData;

    try {
      idsData = await this.obtenerIdsDocumentos(numeroAdmision);
      
      // Validación más estricta de los datos recibidos
      if (!idsData || typeof idsData !== 'object' || Object.keys(idsData).length === 0) {
        throw new Error(`Datos incompletos para la admisión ${numeroAdmision}`);
      }

      // Verificar que tenemos al menos el ID de admisión
      if (!idsData.id_admision) {
        throw new Error(`No se encontró ID de admisión para ${numeroAdmision}`);
      }

      // Filtrar solo los tipos seleccionados que tienen datos
      const tiposAProcesar = this.tiposSeleccionados.filter(tipo => {
        const ids = this.obtenerIdsPorTipo(idsData, tipo);
        return ids.length > 0;
      });

      if (tiposAProcesar.length === 0) {
        throw new Error(`No se encontraron documentos de los tipos seleccionados para admisión ${numeroAdmision}`);
      }

      // Procesar cada tipo de documento
      for (const tipo of tiposAProcesar) {
        const config = tiposMapping[tipo];
        const ids = this.obtenerIdsPorTipo(idsData, tipo);
        
        // Procesar cada ID individualmente para mejor trazabilidad
        for (const id of ids) {
          try {
            const params = config.params(id, idsData.id_admision);
            const resultado = await this.descargarArchivoIndividual(params, tipo);
            
            const resultadoConAdmision = {
              ...resultado,
              admision: numeroAdmision,
              timestamp: new Date().toISOString()
            };
            
            resultados.push(resultadoConAdmision);
            this.resultadosDescarga = [...this.resultadosDescarga, resultadoConAdmision];
            
            if (!resultado.success) {
              throw new Error(resultado.mensaje);
            }
          } catch (error) {
            console.error(`Error procesando ${tipo} ${id} en admisión ${numeroAdmision}:`, error);
            resultados.push({
              success: false,
              mensaje: error.message,
              tipo,
              id,
              admision: numeroAdmision,
              error: true,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      if (resultados.filter(r => r.success).length === 0) {
        throw new Error('No se pudo descargar ningún documento');
      }

      return {
        success: true,
        resultados,
        metadata: {
          total: resultados.length,
          exitosos: resultados.filter(r => r.success).length,
          fallidos: resultados.filter(r => !r.success).length
        }
      };
    } catch (error) {
      console.error(`Error general procesando admisión ${numeroAdmision}:`, error);
      
      // Si no pudimos obtener los IDs, agregamos un resultado de error
      if (!idsData) {
        this.resultadosDescarga = [...this.resultadosDescarga, {
          success: false,
          mensaje: error.message,
          tipo: 'General',
          admision: numeroAdmision,
          error: true,
          timestamp: new Date().toISOString()
        }];
      }
      
      throw new Error(`Admisión ${numeroAdmision}: ${error.message.replace('❌', '').trim()}`);
    }
  }

  async descargarMultiplesAdmisiones() {
    const ids = this.multipleAdmisiones
      .split(/[\s,]+/)
      .map(id => id.trim())
      .filter(id => id && !isNaN(parseInt(id, 10)))
      .filter((v, i, a) => a.indexOf(v) === i);

    if (ids.length === 0) {
      this.status = 'Debes ingresar al menos un ID de admisión válido.';
      this.statusType = 'error';
      return;
    }

    if (!this.epsSeleccionada) {
      this.status = 'Debes seleccionar una EPS.';
      this.statusType = 'error';
      return;
    }

    if (this.tiposSeleccionados.length === 0) {
      this.status = 'Debes seleccionar al menos un tipo de documento.';
      this.statusType = 'error';
      return;
    }

    this.isLoading = true;
    this.statusType = 'info';
    this.status = 'Preparando para descargar documentos...';
    this.totalAdmisiones = ids.length;
    this.progress = 0;
    this.resultadosDescarga = [];
    this.admisionesConError = [];

    try {
      let exitosos = 0;
      let fallidos = 0;
      let documentosTotales = 0;
      let documentosExitosos = 0;

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        this.status = `Procesando admisión ${id} (${i+1}/${ids.length})...`;
        this.progress = ((i + 1) / ids.length) * 100;
        this.requestUpdate();

        try {
          const resultado = await this.descargarDocumentosParaAdmision(id);
          
          exitosos++;
          documentosExitosos += resultado.metadata.exitosos;
          documentosTotales += resultado.metadata.total;
          
          if (resultado.metadata.fallidos > 0) {
            this.admisionesConError.push(id);
            this.statusType = 'warning';
          }
          
          this.status = `Admisión ${id} completada: ${resultado.metadata.exitosos} exitosos, ${resultado.metadata.fallidos} fallidos.`;
        } catch (error) {
          fallidos++;
          this.admisionesConError.push(id);
          this.statusType = 'warning';
          this.status = `Error procesando admisión ${id}: ${error.message}`;
        }

        // Pequeña pausa entre admisiones para no saturar el servidor
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Resumen final
      let resumen = `Proceso completado. `;
      resumen += `Admisiones: ${exitosos} exitosas, ${fallidos} fallidas. `;
      resumen += `Documentos: ${documentosExitosos} descargados de ${documentosTotales}.`;
      
      if (this.admisionesConError.length > 0) {
        resumen += ` Admisiones con errores: ${this.admisionesConError.join(', ')}`;
        this.statusType = fallidos === ids.length ? 'error' : 'warning';
      } else {
        this.statusType = 'success';
      }
      
      this.status = resumen;
    } catch (error) {
      this.status = `Error general: ${error.message}`;
      this.statusType = 'error';
    } finally {
      this.isLoading = false;
      this.progress = 100;
    }
  }

  async retryFailedDownloads() {
    if (this.admisionesConError.length === 0) return;
    
    this.multipleAdmisiones = this.admisionesConError.join(', ');
    this.admisionesConError = [];
    await this.descargarMultiplesAdmisiones();
  }

  toggleShowOnlyErrors() {
    this.showOnlyErrors = !this.showOnlyErrors;
  }

  renderResultados() {
    if (this.resultadosDescarga.length === 0) return html``;
    
    // Filtrar resultados si solo queremos ver errores
    const resultados = this.showOnlyErrors 
      ? this.resultadosDescarga.filter(r => r.error || !r.success)
      : this.resultadosDescarga;
    
    if (resultados.length === 0) {
      return html`
        <div class="status info">
          No hay errores para mostrar. Todos los documentos se descargaron correctamente.
        </div>
      `;
    }
    
    // Agrupar por admisión para mejor organización
    const resultadosPorAdmision = resultados.reduce((acc, resultado) => {
      if (!acc[resultado.admision]) {
        acc[resultado.admision] = [];
      }
      acc[resultado.admision].push(resultado);
      return acc;
    }, {});
    
    return html`
      <div class="summary">
        Mostrando ${resultados.length} de ${this.resultadosDescarga.length} resultados
        <button 
          class="retry-btn" 
          @click=${this.retryFailedDownloads}
          ?disabled=${this.admisionesConError.length === 0 || this.isLoading}>
          Reintentar errores
        </button>
        <label style="margin-left: 15px;">
          <input 
            type="checkbox" 
            .checked=${this.showOnlyErrors}
            @change=${this.toggleShowOnlyErrors}>
          Mostrar solo errores
        </label>
      </div>
      
      <div class="resultados-descarga">
        ${Object.entries(resultadosPorAdmision).map(([admision, docs]) => html`
          <h4>Admisión ${admision}</h4>
          ${docs.map(item => html`
            <div class="resultado-item ${item.error ? 'error' : item.success ? 'success' : 'warning'}">
              <strong>${item.tipo || 'Documento'}:</strong> ${item.nombreArchivo || item.id || 'N/A'}<br>
              <small>${item.mensaje || (item.success ? 'Descargado correctamente' : 'Estado desconocido')}</small>
              ${item.error ? html`<small style="color: red;">❌ Error</small>` : ''}
              ${item.success ? html`<small style="color: green;">✓ Éxito</small>` : ''}
            </div>
          `)}
        `)}
      </div>
    `;
  }

  render() {
    return html`
      <h1>Descargar Documentos de Admisión</h1>

      <div>
        <label for="admisiones">IDs de Admisión (separados por comas o espacios):</label>
        <textarea
          id="admisiones"
          placeholder="Ejemplo: 12345, 67890, 54321"
          .value=${this.multipleAdmisiones}
          @input=${e => this.multipleAdmisiones = e.target.value}
          ?disabled=${this.isLoading}
        ></textarea>
      </div>

      <div>
        <label for="eps">EPS:</label>
        <select 
          id="eps"
          .value=${this.epsSeleccionada}
          @change=${e => this.epsSeleccionada = e.target.value}
          ?disabled=${this.isLoading}>
          <option value="">Seleccione EPS</option>
          <option value="NUEVA_EPS">NUEVA EPS</option>
          <option value="SURA">SURA</option>
          <option value="COOMEVA">COOMEVA</option>
          <option value="SANITAS">SANITAS</option>
          <option value="OTRA">Otra EPS</option>
        </select>
      </div>

      <div>
        <label>Tipos de Documentos a Descargar:</label>
        <div class="tipo-docs">
          ${['Historia Clínica', 'Evolución', 'Nota de Enfermería', 'Orden Médica', 'Admisión', 'Egreso', 'Anexo 2', 'Factura'].map(tipo => html`
            <label>
              <input 
                type="checkbox" 
                .checked=${this.tiposSeleccionados.includes(tipo)}
                @change=${() => this.toggleTipoSeleccionado(tipo)}
                ?disabled=${this.isLoading}
              >
              ${tipo}
            </label>
          `)}
        </div>
      </div>

      <button 
        @click=${this.descargarMultiplesAdmisiones} 
        ?disabled=${this.isLoading || !this.multipleAdmisiones || !this.epsSeleccionada || this.tiposSeleccionados.length === 0}>
        ${this.isLoading ? 'Descargando...' : 'Iniciar Descargas'}
      </button>

      ${this.totalAdmisiones > 0 ? html`
        <div class="progress-container">
          <div class="progress-bar" style="width: ${this.progress}%"></div>
        </div>
      ` : ''}

      ${this.status ? html`
        <div class="status ${this.statusType}">
          ${this.status}
        </div>
      ` : ''}

      ${this.renderResultados()}
    `;
  }
}

customElements.define('descargar-archivos', DescargarArchivos);