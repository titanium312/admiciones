import { LitElement, html, css } from 'lit';

class DescargarArchivos extends LitElement {
  static styles = css`

  `;

  static properties = {
    carpeta: { type: String },
    admisionesData: { type: Object },
    isLoading: { type: Boolean },
    status: { type: String },
    isError: { type: Boolean },
    documentos: { type: Array },
    loginData: { type: Object },
    numeroAdmision: { type: String },
    epsSeleccionada: { type: String },
    mostrarConfirmacion: { type: Boolean },
    documentosSeleccionados: { type: Object }
  };

  constructor() {
    super();
    this.admisionesData = null;
    this.isLoading = false;
    this.status = '';
    this.isError = false;
    this.documentos = [];
    this.numeroAdmision = '';
    this.epsSeleccionada = '';
    this.mostrarConfirmacion = false;
    this.documentosSeleccionados = {};
    this.loginData = {
      institucion: { id_institucion: 1 },
      usuario: { id_usuario: 6874 }
    };
  }

  get carpetaNombre() {
    return `descarga_${this.loginData.usuario.id_usuario}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  async verificarCarpeta() {
    try {
      const response = await fetch(`http://localhost:3000/eiliminar?nombreCarpeta=${this.carpetaNombre}`);
      
      if (!response.ok) {
        const text = await response.text();
        if (text.includes('no existe')) {
          return { existe: false };
        }
        throw new Error(text);
      }
      
      const data = await response.json();
      return { existe: true, data };
      
    } catch (error) {
      if (error.message.includes('confirmacion')) {
        return { existe: true };
      }
      return { existe: false };
    }
  }

  async eliminarCarpeta() {
    try {
      const response = await fetch(`http://localhost:3000/eiliminar?nombreCarpeta=${this.carpetaNombre}&confirmacion=si`);
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const data = await response.json();
      return data.carpetaEliminada === this.carpetaNombre;
      
    } catch (error) {
      console.error('Error eliminando carpeta:', error);
      return false;
    }
  }

  async obtenerAdmisiones() {
    const admNum = parseInt(this.numeroAdmision, 10);

    if (!this.numeroAdmision || isNaN(admNum)) {
      this.status = 'Por favor ingresa un número de admisión válido.';
      this.isError = true;
      this.requestUpdate();
      return;
    }

    this.isLoading = true;
    this.status = `Obteniendo datos para admisión ${this.numeroAdmision}...`;
    this.isError = false;
    this.documentos = [];
    this.documentosSeleccionados = {};
    this.mostrarConfirmacion = false;
    this.requestUpdate();

    try {
      const response = await fetch('http://localhost:3000/api/admisiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_institucion: this.loginData.institucion.id_institucion,
          numeros_admision: [admNum]
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      this.admisionesData = await response.json();
      this.status = '✅ Datos obtenidos correctamente';

      const admision = Object.values(this.admisionesData?.resultados || {})[0];
      if (admision) {
        // Organizamos los documentos por tipo
        this.documentos = [
          ...(admision.id_historia ? [{tipo: 'Historia Clínica', id: admision.id_historia}] : []),
          ...(admision.evoluciones?.length ? admision.evoluciones.map(id => ({tipo: 'Evolución', id})) : []),
          ...(admision.notas_enfermeria?.length ? admision.notas_enfermeria.map(id => ({tipo: 'Nota de Enfermería', id})) : []),
          ...(admision.ordenes_medicas?.length ? admision.ordenes_medicas.map(id => ({tipo: 'Orden Médica', id})) : []),
          ...(admision.id_admision ? [{tipo: 'Admisión', id: admision.id_admision}] : []),
          ...(admision.id_egreso?.length ? admision.id_egreso.map(id => ({tipo: 'Egreso', id})) : []),
          ...(admision.anexo2?.length ? admision.anexo2.map(id => ({tipo: 'Anexo 2', id})) : []),
          ...(admision.facturas?.length ? admision.facturas.map(id => ({tipo: 'Factura', id})) : [])
        ];
        
        // Marcamos todos como seleccionados por defecto
        this.documentos.forEach(doc => {
          this.documentosSeleccionados[doc.id] = true;
        });
      }

    } catch (error) {
      console.error('Error:', error);
      this.status = `❌ Error: ${error.message}`;
      this.isError = true;
    } finally {
      this.isLoading = false;
      this.requestUpdate();
    }
  }

  toggleSeleccionDocumento(id) {
    this.documentosSeleccionados[id] = !this.documentosSeleccionados[id];
    this.requestUpdate();
  }

  toggleSeleccionTodos() {
    const todosSeleccionados = this.estanTodosSeleccionados();
    this.documentos.forEach(doc => {
      this.documentosSeleccionados[doc.id] = !todosSeleccionados;
    });
    this.requestUpdate();
  }

  estanTodosSeleccionados() {
    return this.documentos.every(doc => this.documentosSeleccionados[doc.id]);
  }

  async iniciarDescarga(eliminarExistente = false, soloSeleccionados = false) {
    this.isLoading = true;
    this.mostrarConfirmacion = false;
    
    try {
      if (eliminarExistente) {
        this.status = 'Eliminando carpeta existente...';
        this.requestUpdate();
        
        const eliminado = await this.eliminarCarpeta();
        if (!eliminado) {
          throw new Error('No se pudo eliminar la carpeta existente');
        }
      }

      const admision = Object.values(this.admisionesData.resultados)[0];
      const paciente = admision?.paciente;

      const nombreArchivo = `${paciente?.tipo_documento_paciente}_${paciente?.documento_paciente}`;
      const eps = this.epsSeleccionada;

      const params = new URLSearchParams({
        institucionId: this.loginData.institucion.id_institucion,
        idUser: this.loginData.usuario.id_usuario,
        nombreCarpeta: this.carpetaNombre,
        nombreArchivo,
        eps
      });

      // Filtramos los documentos según selección
      if (soloSeleccionados) {
        const idsSeleccionados = this.documentos
          .filter(doc => this.documentosSeleccionados[doc.id])
          .map(doc => doc.id);
        
        if (idsSeleccionados.length === 0) {
          throw new Error('No hay documentos seleccionados para descargar');
        }

        params.append('idsDocumentos', idsSeleccionados.join(','));
      } else {
        // Descargar todo como antes
        if (admision.id_historia) params.append('idsHistorias', admision.id_historia);
        if (admision.evoluciones?.length) params.append('idsEvoluciones', admision.evoluciones.join(','));
        if (admision.notas_enfermeria?.length) params.append('idsNotasEnfermeria', admision.notas_enfermeria.join(','));
        if (admision.ordenes_medicas?.length) params.append('idsOrdenMedicas', admision.ordenes_medicas.join(','));
        if (admision.id_admision) params.append('idsAdmisiones', admision.id_admision);
        if (admision.id_egreso?.length) params.append('idEgresos', admision.id_egreso.join(','));
        if (admision.anexo2?.length) params.append('idAnexosDos', admision.anexo2.join(','));
        if (admision.facturas?.length) params.append('idFacturas', admision.facturas.join(','));
      }

      const url = `http://localhost:3000/Hs_Anx?${params.toString()}`;
      window.open(url, '_blank');

      this.status = eliminarExistente 
        ? '✅ Descarga completa iniciada (carpeta limpiada)' 
        : soloSeleccionados
          ? '✅ Descarga de documentos seleccionados iniciada'
          : '✅ Descarga incremental iniciada (archivos existentes conservados)';

    } catch (error) {
      console.error('Error al descargar:', error);
      this.status = `❌ Error al descargar: ${error.message}`;
      this.isError = true;
    } finally {
      this.isLoading = false;
      this.requestUpdate();
    }
  }

  async descargarSeleccionados() {
    if (!this.admisionesData?.resultados) {
      this.status = 'Primero debes obtener los datos de admisiones.';
      this.isError = true;
      this.requestUpdate();
      return;
    }

    if (!this.epsSeleccionada) {
      this.status = 'Debes seleccionar una EPS.';
      this.isError = true;
      this.requestUpdate();
      return;
    }

    const seleccionados = Object.values(this.documentosSeleccionados).filter(Boolean).length;
    if (seleccionados === 0) {
      this.status = 'Por favor selecciona al menos un documento para descargar.';
      this.isError = true;
      this.requestUpdate();
      return;
    }

    this.isLoading = true;
    this.status = 'Preparando descarga de documentos seleccionados...';
    this.isError = false;
    this.requestUpdate();

    try {
      const { existe } = await this.verificarCarpeta();
      
      if (existe) {
        this.status = '⚠️ Ya existe una carpeta con descargas previas. ¿Qué deseas hacer?';
        this.mostrarConfirmacion = true;
        this.isLoading = false;
        return;
      }

      await this.iniciarDescarga(false, true);
      
    } catch (error) {
      console.error('Error:', error);
      this.status = `❌ Error: ${error.message}`;
      this.isError = true;
      this.isLoading = false;
    }
  }

  async descargarTodo() {
    if (!this.admisionesData?.resultados) {
      this.status = 'Primero debes obtener los datos de admisiones.';
      this.isError = true;
      this.requestUpdate();
      return;
    }

    if (!this.epsSeleccionada) {
      this.status = 'Debes seleccionar una EPS.';
      this.isError = true;
      this.requestUpdate();
      return;
    }

    this.isLoading = true;
    this.status = 'Verificando carpeta de descargas...';
    this.isError = false;
    this.requestUpdate();

    try {
      const { existe } = await this.verificarCarpeta();
      
      if (existe) {
        this.status = '⚠️ Ya existe una carpeta con descargas previas. ¿Qué deseas hacer?';
        this.mostrarConfirmacion = true;
        this.isLoading = false;
        return;
      }

      await this.iniciarDescarga(false);
      
    } catch (error) {
      console.error('Error:', error);
      this.status = `❌ Error: ${error.message}`;
      this.isError = true;
      this.isLoading = false;
    }
  }

descargarDocumento(id) {
  const documento = this.documentos.find(doc => doc.id === id);
  if (!documento) return;

  // URL base diferente para facturas vs otros documentos
  const isFactura = documento.tipo === 'Factura';
  const baseUrl = isFactura 
    ? 'http://localhost:3000/descargar-archivo' 
    : 'http://localhost:3000/Hs_Anx';

  const params = new URLSearchParams({
    nombreCarpeta: this.carpetaNombre,
    nombreArchivo: `${documento.tipo}_${id}`,
    institucionId: this.loginData.institucion.id_institucion,
    idUser: this.loginData.usuario.id_usuario,
    eps: this.epsSeleccionada
  });

  // Agregar el parámetro correcto según el tipo de documento
  switch (documento.tipo) {
    case 'Factura':
      params.append('idFactura', id);
      break;
    case 'Historia Clínica':
      params.append('idsHistorias', id);
      break;
    case 'Evolución':
      params.append('idsEvoluciones', id);
      break;
    case 'Nota de Enfermería':
      params.append('idsNotasEnfermeria', id);
      break;
    case 'Orden Médica':
      params.append('idsOrdenMedicas', id);
      break;
    case 'Admisión':
      params.append('idsAdmisiones', id);
      break;
    case 'Egreso':
      params.append('idEgresos', id);
      break;
    case 'Anexo 2':
      params.append('idAnexosDos', id);
      break;
    default:
      console.warn('❗ Tipo de documento no reconocido:', documento.tipo);
      this.status = `❌ No se puede descargar el tipo de documento: ${documento.tipo}`;
      this.isError = true;
      this.requestUpdate();
      return;
  }

  // Abrir la URL con los parámetros correctos
  window.open(`${baseUrl}?${params.toString()}`, '_blank');
}
  cancelarDescarga() {
    this.mostrarConfirmacion = false;
    this.status = '🚫 Descarga cancelada por el usuario';
    this.isError = true;
    this.isLoading = false;
  }

  reset() {
    this.numeroAdmision = '';
    this.admisionesData = null;
    this.documentos = [];
    this.documentosSeleccionados = {};
    this.epsSeleccionada = '';
    this.status = '';
    this.isError = false;
    this.mostrarConfirmacion = false;
    this.requestUpdate();
  }

  render() {
    const inputError = this.isError && (!this.numeroAdmision || isNaN(parseInt(this.numeroAdmision, 10)));
    const admision = Object.values(this.admisionesData?.resultados || {})[0];
    const paciente = admision?.paciente;
    const todosSeleccionados = this.estanTodosSeleccionados();

    return html`
      <h1>Descargar Archivos</h1>

      <input
        class="${inputError ? 'error-input' : ''}"
        type="text"
        .value=${this.numeroAdmision}
        @input=${e => this.numeroAdmision = e.target.value}
        placeholder="Ingresa número de admisión"
        ?disabled=${this.isLoading}
      />

      <select 
        .value=${this.epsSeleccionada}
        @change=${e => this.epsSeleccionada = e.target.value}
        ?disabled=${this.isLoading}>
        <option value="">Seleccione EPS</option>
        <option value="NUEVA_EPS">NUEVA_EPS</option>
        <option value="OTRA_EPS">OTRA_EPS</option>
      </select>

      <div class="button-group">
        <button 
          @click=${this.obtenerAdmisiones} 
          ?disabled=${this.isLoading || !this.numeroAdmision}>
          Obtener Datos
        </button>

        <button 
          @click=${this.descargarTodo} 
          ?disabled=${this.isLoading || !this.admisionesData}>
          Descargar Todo
        </button>

        <button 
          @click=${this.descargarSeleccionados} 
          ?disabled=${this.isLoading || !this.admisionesData}>
          Descargar Selección
        </button>

        <button 
          class="reset-btn"
          @click=${this.reset}
          ?disabled=${this.isLoading}>
          Reiniciar
        </button>
      </div>

      ${this.isLoading ? html`<div class="loader">⏳ Procesando...</div>` : ''}

      ${this.status ? html`
        <div class="status ${this.isError ? 'error' : 'success'}">
          ${this.status}
        </div>
      ` : ''}

      ${this.mostrarConfirmacion ? html`
        <div class="confirm-dialog">
          <p>${this.status}</p>
          <div class="confirm-options">
            <button class="option-delete" @click=${() => this.iniciarDescarga(true)}>
              Eliminar y descargar todo
            </button>
            <button class="option-keep" @click=${() => this.iniciarDescarga(false)}>
              Conservar y descargar faltantes
            </button>
            <button class="option-cancel" @click=${this.cancelarDescarga}>
              Cancelar
            </button>
          </div>
        </div>
      ` : ''}

      ${paciente ? html`
        <div class="paciente-info">
          <h3>Datos del Paciente</h3>
          <p><strong>Nombre:</strong> ${paciente.nombre1_paciente} ${paciente.nombre2_paciente || ''} ${paciente.apellido1_paciente} ${paciente.apellido2_paciente || ''}</p>
          <p><strong>Documento:</strong> ${paciente.tipo_documento_paciente} ${paciente.documento_paciente}</p>
        </div>
      ` : ''}

      ${this.documentos.length > 0 ? html`
        <div class="documentos-container">
          <h3>Documentos Disponibles</h3>
          
          <div class="select-all">
            <input 
              type="checkbox" 
              id="select-all"
              .checked=${todosSeleccionados}
              @change=${this.toggleSeleccionTodos}
              ?disabled=${this.isLoading}
            >
            <label for="select-all">Seleccionar todos</label>
          </div>
          
          ${this.documentos.map(doc => html`
            <div class="documento-item">
              <label>
                <input 
                  type="checkbox" 
                  class="documento-checkbox"
                  .checked=${!!this.documentosSeleccionados[doc.id]}
                  @change=${() => this.toggleSeleccionDocumento(doc.id)}
                  ?disabled=${this.isLoading}
                >
                <span class="documento-info">${doc.tipo} (ID: ${doc.id})</span>
              </label>
              <button 
                class="documento-btn" 
                @click=${() => this.descargarDocumento(doc.id)}
                ?disabled=${this.isLoading}>
                Descargar
              </button>
            </div>
          `)}
        </div>
      ` : ''}

      ${this.admisionesData ? html`
        <details>
          <summary>Ver datos completos de admisión</summary>
          <pre>${JSON.stringify(this.admisionesData, null, 2)}</pre>
        </details>
      ` : ''}
    `;
  }
}

customElements.define('descargar-archivos', DescargarArchivos);

