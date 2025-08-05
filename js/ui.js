let authToken = '';
let usuarioData = {};
let institucionData = {};

document.getElementById('authForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const username = document.getElementById('idUsuario').value;
  const password = document.getElementById('cont').value;

  try {
    mostrarStatus('Autenticando...', 'info');

    const response = await fetch(`${API_URL}/istitucion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.token && data.token !== "") {
      authToken = data.token;
      usuarioData = data.usuario;
      institucionData = data.institucion;
      
      mostrarStatus(`✅ Autenticación exitosa\nUsuario: ${data.usuario.nombre}\nInstitución: ${data.institucion.nombre_institucion}`, 'success');
      
      document.getElementById('authSection').style.display = 'none';
      document.getElementById('mainSection').style.display = 'block';
    } else {
      mostrarStatus('❌ Autenticación fallida. Verifica tus credenciales.', 'error');
    }
  } catch (error) {
    mostrarStatus('❌ Error de conexión. Verifica que el servidor esté funcionando.', 'error');
  }
});
