const { createToken } = require('./Base/toke'); // Generador del token
const { descargarYRenombrarConPrefijo } = require('../descargas/descargas'); // Modificada

async function Hs_Anx(req, res) {
  try {
    const { institucionId, idUser, nombreCarpeta } = req.query;

    if (!institucionId) return res.status(400).send('❌ Parámetro institucionId es requerido');
    if (!idUser) return res.status(400).send('❌ Parámetro idUser es requerido');
    if (!nombreCarpeta) return res.status(400).send('❌ Parámetro nombreCarpeta  es requerido'); // Verificar que se envíe el nombreCarpeta

    const reportMapping = [
      { param: 'idsHistorias', report: 'ListadoHistoriasClinicasDetallado3' },
      { param: 'idAnexosDos', report: 'ListadoanexoDosDetallado' },
      { param: 'idEgresos', report: 'ListadoEpicrisis' },
      { param: 'idsEvoluciones', report: 'ListadoEvolucionDestallado' },
      { param: 'idsNotasEnfermeria', report: 'ListadoNotasEnfermeriaDestallado' },
      { param: 'idsAdmisiones', report: 'ListadoAdmisionesDetallado' },
      { param: 'idAdmisiones', report: 'ListadoPrefacturasDetallado' },
      { param: 'idsOrdenMedicas', report: 'ListadoOrdenMedicasDestallado' }
    ];

    const resultados = [];

    // Buscar los parámetros presentes y procesarlos
    for (const { param, report } of reportMapping) {
      if (req.query[param]) {
        const ids = req.query[param].split(',').map(id => id.trim()).filter(Boolean);
        for (const id of ids) {
          const token = createToken(report, institucionId, 83, idUser);
          const modulo = getModulo(report);
          const baseUrl = 'https://reportes.saludplus.co/view.aspx';
          const url = `${baseUrl}?modulo=${modulo}&reporte=${report}&render=pdf&hideTool=true&environment=1&userId=${idUser}&${param}=${encodeURIComponent(id)}&token=${token}`;

          const nombreArchivo = `${report}_${id}.pdf`;

          try {
            const rutaGuardada = await descargarYRenombrarConPrefijo(nombreArchivo, url, report, nombreCarpeta);
            resultados.push({ id, archivo: rutaGuardada, status: 'descargado' });
          } catch (err) {
            resultados.push({ id, error: err.message });
          }
        }
      }
    }

    if (resultados.length === 0) {
      return res.status(400).send('❌ No se recibió ningún parámetro válido para generar reporte');
    }

    return res.json({
      mensaje: '✅ Archivos descargados correctamente',
      archivos: resultados
    });

  } catch (error) {
    console.error('🔥 Error en Hs_Anx:', error);
    res.status(500).send('❌ Error interno del servidor');
  }
}

// Módulo según el reporte
function getModulo(reportName) {
  const moduloMapping = {
    ListadoHistoriasClinicasDetallado3: 'HistoriasClinicas',
    ListadoanexoDosDetallado: 'Facturacion',
    ListadoEpicrisis: 'Asistencial',
    ListadoEvolucionDestallado: 'Asistencial',
    ListadoNotasEnfermeriaDestallado: 'Asistencial',
    ListadoAdmisionesDetallado: 'Facturacion',
    ListadoPrefacturasDetallado: 'Facturacion',
    ListadoPrescripcionMedicamentosDetallado: 'Asistencial',
    ListadoOrdenMedicasDestallado: 'Asistencial'
  };
  return moduloMapping[reportName] || 'Asistencial';
}

module.exports = { Hs_Anx };
