const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Mapeo de carpetas para cada reporte
const folderMapping = {
  ListadoHistoriasClinicasDetallado3: 'HistoriaClinica',
  ListadoanexoDosDetallado: 'nexo02',
  ListadoEpicrisis: 'epicrisis',
  ListadoEvolucionDestallado: 'evoluciones',
  ListadoNotasEnfermeriaDestallado: 'notasEnfermeria',
  ListadoAdmisionesDetallado: 'admisiones',
  ListadoPrefacturasDetallado: 'prefacturas',
  ListadoPrescripcionMedicamentosDetallado: 'prescripcion',
  ListadoOrdenMedicasDestallado: 'ordenMedicas'
};

// Función para descargar con el prefijo de carpeta
async function descargarYRenombrarConPrefijo(nombreArchivo, url, report, prefijo) {
  try {
    // Carpeta donde guardar
    const folderName = folderMapping[report] || 'otrosReportes';
    const downloadDir = path.resolve(__dirname, 'descarga', prefijo, folderName); // Carpeta con el prefijo
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // Ruta completa del archivo
    const filePath = path.join(downloadDir, nombreArchivo);

    // Descargar usando axios con stream
    const response = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    // Esperar a que termine la escritura
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    return filePath; // Devuelve la ruta donde se guardó

  } catch (error) {
    throw new Error(`Error descargando archivo: ${error.message}`);
  }
}











// Nueva función para descargas con POST y token
async function descargarConToken(nombreArchivo, url, token, prefijo) {
  try {
    // Carpeta donde guardar
    const downloadDir = path.resolve(__dirname, 'descarga', prefijo); // Carpeta con el prefijo
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // Ruta completa del archivo
    const filePath = path.join(downloadDir, nombreArchivo);

    // Crear formulario con token
    const form = new FormData();
    form.append('token', token);

    // Descargar usando axios con POST
    const response = await axios.post(url, form, {
      responseType: 'stream',
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'Mozilla/5.0',
      }
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    // Esperar a que termine la escritura
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    return filePath; // Devuelve la ruta donde se guardó

  } catch (error) {
    throw new Error(`Error descargando archivo con token: ${error.message}`);
  }
}

module.exports = { 
  descargarYRenombrarConPrefijo,
  descargarConToken 
};
