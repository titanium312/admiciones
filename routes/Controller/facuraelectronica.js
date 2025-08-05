const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function descargarArchivo(req, res) {
  try {
    const { idFactura, nombreArchiv, nombreCarpeta } = req.query;

    // Validación de los parámetros necesarios
    if (!idFactura || !nombreArchiv) {
      return res.status(400).send('❌ El parámetro idFactura y nombreArchiv son requeridos');
    }

    // URL del servicio de descarga
    const url = `https://server-01.saludplus.co/facturasAdministar/GetZipFile?IdFactura=${idFactura}`;

    // Realizamos la solicitud con axios para obtener la URL del archivo
    const response = await axios.get(url);

    // Verificar que la respuesta sea válida
    if (response.data.valorRetorno !== 1) {
      return res.status(400).send('❌ Error al obtener la información de la factura');
    }

    // Obtener la URL del archivo de la respuesta
    const archivoUrl = response.data.archivo;
    if (!archivoUrl) {
      return res.status(400).send('❌ No se encontró la URL del archivo en la respuesta');
    }

    // Verificar y crear el directorio de descarga si no existe
    const downloadDir = path.resolve(__dirname, `../descargas/descarga/${nombreCarpeta}/Factura Electronica`);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // Realizamos la descarga del archivo desde la URL proporcionada
    const archivoResponse = await axios.get(archivoUrl, { responseType: 'stream' });

    // Ruta donde se guardará el archivo
    const filePath = path.join(downloadDir, `${nombreArchiv}.zip`);
    const writer = fs.createWriteStream(filePath);

    // Guardamos el archivo en el disco
    archivoResponse.data.pipe(writer);

    // Esperar a que termine de guardar el archivo
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Responder con la ruta del archivo guardado y el nombre del archivo
    res.json({
      mensaje: '✅ Archivo descargado correctamente',
      archivo: filePath,
      nombreArchivo: `${nombreArchiv}.zip`  // Aquí agregamos la extensión .zip
    });

  } catch (error) {
    console.error('🔥 Error descargando archivo:', error);
    res.status(500).send('❌ Error interno al descargar archivo');
  }
}

module.exports = { descargarArchivo };
