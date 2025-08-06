const sql = require('mssql');

// Configuración de la base de datos
const dbConfig = {
  user: 'developer',
  password: 'lsbQUA2Z75)2',
  server: '54.159.152.155',
  database: 'SaludPlus24HRS',
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  connectionTimeout: 15000
};

const institucion = async (req, res) => {
  const { idUsuario } = req.body;

  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request()
      .input('idUsuario', sql.Int, idUsuario)
      .query(`
        SELECT id_institucion, nombre_institucion 
        FROM instituciones 
        JOIN instituciones_usuarios ON fk_institucion = id_institucion 
        WHERE fk_usuario = @idUsuario
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching institutions:', error.message);
    res.status(500).json({ error: 'Error fetching institutions' });
  }
};

const procesarAdmisiones = async (req, res) => {
  const { id_institucion, numeros_admision } = req.body;
  const resultados = {};

  try {
    const pool = await sql.connect(dbConfig);

    for (const num of numeros_admision) {
      const admisionData = {
        id_admision: null,
        id_historia: null,
        paciente: null,
        evoluciones: [],
        notas_enfermeria: [],
        ordenes_medicas: [],
        id_egreso: [],
        anexo2: [],
        facturas: []
      };

      try {
        // Obtener id_admision y fk_paciente
        const resultAdm = await pool.request()
          .input('id_institucion', sql.Int, id_institucion)
          .input('num_admision', sql.Int, num)
          .query(`
            SELECT TOP 1 id_admision, fk_paciente 
            FROM facturacion_admisiones 
            WHERE fk_institucion = @id_institucion AND numero_admision = @num_admision
          `);

        if (resultAdm.recordset.length > 0) {
          const { id_admision, fk_paciente } = resultAdm.recordset[0];
          admisionData.id_admision = id_admision;

          // Obtener datos del paciente
          const resultPaciente = await pool.request()
            .input('fk_paciente', sql.Int, fk_paciente)
            .query(`
              SELECT tipo_documento_paciente, documento_paciente, nombre1_paciente 
              FROM pacientes 
              WHERE id_paciente = @fk_paciente
            `);

          if (resultPaciente.recordset.length > 0) {
            admisionData.paciente = resultPaciente.recordset[0];
          }

          // Obtener id_historia
          const resultHist = await pool.request()
            .input('id_admision', sql.Int, id_admision)
            .query(`
              SELECT TOP 1 id_historia 
              FROM historias_clinicas 
              WHERE fk_admision = @id_admision
            `);

          if (resultHist.recordset.length > 0) {
            const id_historia = resultHist.recordset[0].id_historia;
            admisionData.id_historia = id_historia;

            // Consultas paralelas
            const [
              resultNotas,
              resultOrdenes,
              resultEgresos,
              resultEvoluciones,
              resultAnexo2,
              resultFacturas
            ] = await Promise.all([
              pool.request().input('id_historia', sql.Int, id_historia)
                .query(`SELECT id_nota_enfermeria FROM notas_enfermeria WHERE fk_historia = @id_historia`),
              pool.request().input('id_historia', sql.Int, id_historia)
                .query(`SELECT id_orden_medica FROM ordenes_medicas WHERE fk_historia = @id_historia`),
              pool.request().input('id_historia', sql.Int, id_historia)
                .query(`SELECT id_egreso_historia FROM egresos_historia WHERE fk_historia = @id_historia`),
              pool.request().input('id_admision', sql.Int, id_admision)
                .query(`SELECT id_evolucion FROM evoluciones WHERE fk_admision = @id_admision`),
              pool.request().input('id_admision', sql.Int, id_admision)
                .query(`SELECT id_anexo_tecnico_dos FROM anexoDos WHERE fk_admision = @id_admision`),
              pool.request()
                .input('id_institucion', sql.Int, id_institucion)
                .input('id_admision', sql.Int, id_admision)
                .query(`
                  SELECT id_factura 
                  FROM facturas 
                  WHERE fk_institucion = @id_institucion 
                    AND fk_admision = @id_admision
                `)
            ]);

            admisionData.notas_enfermeria = resultNotas.recordset.map(r => r.id_nota_enfermeria);
            admisionData.ordenes_medicas = resultOrdenes.recordset.map(r => r.id_orden_medica);
            admisionData.id_egreso = resultEgresos.recordset.map(r => r.id_egreso_historia);
            admisionData.evoluciones = resultEvoluciones.recordset.map(r => r.id_evolucion);
            admisionData.anexo2 = resultAnexo2.recordset.map(r => r.id_anexo_tecnico_dos);
            admisionData.facturas = resultFacturas.recordset.map(r => r.id_factura);
          }

          resultados[num] = admisionData;
        } else {
          resultados[num] = { error: 'Admisión no encontrada' };
        }
      } catch (error) {
        console.error(`Error en admisión ${num}:`, error.message);
        resultados[num] = { error: error.message };
      }
    }

    res.json({ resultados });

  } catch (err) {
    console.error('Error al conectar a la base de datos:', err.message);
    res.status(500).json({ error: 'Error de conexión con la base de datos' });
  }
};




module.exports = { procesarAdmisiones, institucion };
