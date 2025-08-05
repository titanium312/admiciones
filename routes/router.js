const express = require('express');
const router = express.Router();

// Import controller functions
const { obtenerDatosLogin } = require('./Controller/Base/toke');
const { EliminarCarpeta } = require('./descargas/delete');
const { descargarArchivo } = require('./Controller/facuraelectronica');
const { procesarAdmisiones } = require('./Controller/Base/consultaid');
const { descargarMedicamentos } = require('./Controller/medicamentosController');
const { Hs_Anx } = require('./Controller/historias');
const { Informe } = require('./Controller/informe');

const { descargarCarpeta } = require('./descargas/rar');



// area de gereadorde url pdf
router.get('/Hs_Anx', Hs_Anx);
router.get('/descargar-archivo', descargarArchivo);
router.get('/descargar-medicamentos', descargarMedicamentos);
router.get('/informe', Informe);  // 👈 Esto habilita soporte para curl GET


router.get('/descargar', descargarCarpeta);
router.get('/eiliminar', EliminarCarpeta);

//area de cosultas
router.post('/api/admisiones', procesarAdmisiones);
router.post('/api/istitucion', obtenerDatosLogin);

descargarCarpeta
// Route to test server
router.get('/router', (req, res) => {
  res.send('Hola Mundo'); // Send a response to the client
});

module.exports = router;
