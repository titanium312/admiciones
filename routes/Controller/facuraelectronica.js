const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function descargarArchivo(req, res) {
  try {
    const { idFactura, nombreArchivo, nombreCarpeta, institucionId, idUser, eps } = req.query;

    // Validar parámetros obligatorios
    if (!idFactura || !nombreArchivo || !nombreCarpeta || !institucionId || !idUser || !eps) {
      return res.status(400).send('❌ Faltan parámetros obligatorios (idFactura, nombreArchivo, nombreCarpeta, institucionId, idUser, eps)');
    }

    // URL del servicio externo para obtener la URL del ZIP de la factura
    const url = `https://server-01.saludplus.co/facturasAdministar/GetZipFile?IdFactura=${idFactura}`;

    // Obtener info de la factura (incluye la URL del archivo)
    const response = await axios.get(url);

    if (response.data.valorRetorno !== 1) {
      return res.status(400).send('❌ Error al obtener la información de la factura');
    }

    const archivoUrl = response.data.archivo;
    if (!archivoUrl) {
      return res.status(400).send('❌ No se encontró la URL del archivo en la respuesta');
    }

    // Crear carpeta para guardar el archivo, con ruta estructurada
    const downloadDir = path.resolve(__dirname, `../descargas/descarga/${nombreCarpeta}/Factura Electronica`);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // Descargar el archivo ZIP desde archivoUrl
    const archivoResponse = await axios.get(archivoUrl, { responseType: 'stream' });

    // Ruta completa para guardar el archivo
    const filePath = path.join(downloadDir, `${nombreArchivo}.zip`);

    const writer = fs.createWriteStream(filePath);
    archivoResponse.data.pipe(writer);

    // Esperar a que termine la descarga
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // Responder con la ruta y nombre del archivo descargado
    res.json({
      mensaje: '✅ Archivo descargado correctamente',
      archivo: filePath,
      nombreArchivo: `${nombreArchivo}.zip`
    });

  } catch (error) {
    console.error('🔥 Error descargando archivo:', error);
    res.status(500).send('❌ Error interno al descargar archivo');
  }
}

module.exports = { descargarArchivo };
