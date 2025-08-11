// Archivo: routes/tuRuta.js (o donde tengas la función principal)

const { createToken } = require('./Base/toke');
const { descargarYRenombrarConPrefijo } = require('../descargas/descargas');

function obtenerNombrePorEPS(eps, nombreBase) {
  const nombresPorEPS = {
    NUEVA_EPS: {
      historia: "HistoriaNuevaEPS",
      anexo: "AnexoNuevaEPS",
      epicrisis: "EpicrisisNuevaEPS",
      evolucion: "EvolucionNuevaEPS",
      enfermeria: "EnfermeriaNuevaEPS",
      admisiones: "AdmisionesNuevaEPS",
      prefacturas: "PrefacturasNuevaEPS",
      ordenmedica: "OrdenMedicaNuevaEPS",
    },
    OTRA_EPS: {
      historia: "HistoriaOtraEPS",
      anexo: "AnexoOtraEPS",
      epicrisis: "EpicrisisOtraEPS",
      evolucion: "EvolucionOtraEPS",
      enfermeria: "EnfermeriaOtraEPS",
      admisiones: "AdmisionesOtraEPS",
      prefacturas: "PrefacturasOtraEPS",
      ordenmedica: "OrdenMedicaOtraEPS",
    }
  };

  const epsNombres = nombresPorEPS[eps] || {};
  return epsNombres[nombreBase.toLowerCase()] || nombreBase;
}

async function Hs_Anx(req, res) {
  try {
    const { idAdmision, institucionId, idUser, eps } = req.query;

    // Validar parámetros requeridos
    const missingParams = [];
    if (!idAdmision) missingParams.push('idAdmision');
    if (!institucionId) missingParams.push('institucionId');
    if (!idUser) missingParams.push('idUser');
    if (!eps) missingParams.push('eps');
    
    if (missingParams.length > 0) {
      return res.status(400).send(`❌ Parámetros requeridos faltantes: ${missingParams.join(', ')}`);
    }

    const reportMapping = [
      { param: 'idsHistorias', report: 'ListadoHistoriasClinicasDetallado3', nombre: "historia" },
      { param: 'idAnexosDos', report: 'ListadoanexoDosDetallado', nombre: "anexo" },
      { param: 'idEgresos', report: 'ListadoEpicrisis', nombre: "epicrisis" },
      { param: 'idsEvoluciones', report: 'ListadoEvolucionDestallado', nombre: "evolucion" },
      { param: 'idsNotasEnfermeria', report: 'ListadoNotasEnfermeriaDestallado', nombre: "enfermeria" },
      { param: 'idsAdmisiones', report: 'ListadoAdmisionesDetallado', nombre: "admisiones" },
      { param: 'idAdmisiones', report: 'ListadoPrefacturasDetallado', nombre: "prefacturas" },
      { param: 'idsOrdenMedicas', report: 'ListadoOrdenMedicasDestallado', nombre: "ordenmedica" }
    ];

    const resultados = [];
    let hasValidParams = false;

    for (const { param, report, nombre } of reportMapping) {
      if (req.query[param]) {
        hasValidParams = true;
        const ids = req.query[param].split(',').map(id => id.trim()).filter(Boolean);

        // Obtener nombre ajustado según EPS
        const nombreAUsar = obtenerNombrePorEPS(eps, nombre);

        for (const id of ids) {
          const token = createToken(report, institucionId, 83, idUser);
          const modulo = getModulo(report);
          const urlParams = new URLSearchParams({
            modulo,
            reporte: report,
            render: 'pdf',
            hideTool: 'true',
            environment: '1',
            userId: idUser,
            [param]: id,
            token
          });
          const url = `https://reportes.saludplus.co/view.aspx?${urlParams.toString()}`;

          // Nombre del archivo: tipoDocumento-idDocumento.pdf
          const nombreArchivoCompleto = `${nombreAUsar}-${id}.pdf`;

          try {
            // Aquí pasamos idAdmision como "report" para la carpeta, y idUser como prefijo
            const rutaGuardada = await descargarYRenombrarConPrefijo(
              nombreArchivoCompleto,
              url,
              idAdmision,
              idUser
            );

            resultados.push({
              id,
              reporte: report,
              ruta: rutaGuardada,
              nombreArchivo: nombreArchivoCompleto,
              status: 'success'
            });
          } catch (err) {
            resultados.push({
              id,
              reporte: report,
              error: err.message,
              nombreArchivo: nombreArchivoCompleto,
              status: 'error'
            });
          }
        }
      }
    }

    if (!hasValidParams) {
      return res.status(400).send('❌ No se recibió ningún parámetro válido para generar reporte');
    }

    return res.json({
      success: resultados.every(r => r.status === 'success'),
      message: resultados.some(r => r.status === 'error')
        ? 'Algunos archivos no se pudieron descargar'
        : '✅ Todos los archivos descargados correctamente',
      resultados,
      metadata: {
        carpetaAdmision: idAdmision,
        eps,
        total: resultados.length,
        exitosos: resultados.filter(r => r.status === 'success').length,
        fallidos: resultados.filter(r => r.status === 'error').length
      }
    });

  } catch (error) {
    console.error('🔥 Error en Hs_Anx:', error);
    res.status(500).json({
      error: '❌ Error interno del servidor',
      detalle: error.message
    });
  }
}

function getModulo(reportName) {
  const moduloMapping = {
    ListadoHistoriasClinicasDetallado3: 'HistoriasClinicas',
    ListadoanexoDosDetallado: 'Facturacion',
    ListadoEpicrisis: 'Asistencial',
    ListadoEvolucionDestallado: 'Asistencial',
    ListadoNotasEnfermeriaDestallado: 'Asistencial',
    ListadoAdmisionesDetallado: 'Facturacion',
    ListadoPrefacturasDetallado: 'Facturacion',
    ListadoOrdenMedicasDestallado: 'Asistencial'
  };
  return moduloMapping[reportName] || 'Asistencial';
}

module.exports = { Hs_Anx };
