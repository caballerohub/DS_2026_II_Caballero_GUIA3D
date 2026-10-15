const API = 'https://api.github.com';
const form = document.querySelector('#form-buscar');
const input = document.querySelector('#input-usuario');
const selectOrden = document.querySelector('#select-orden');
const boton = document.querySelector('#btn-buscar');
const estado = document.querySelector('#estado');
const perfil = document.querySelector('#perfil');
const titulo = document.querySelector('#titulo-repos');
const repos = document.querySelector('#repos');
const divResumen = document.querySelector('#resumen-lenguajes');
const btnCargarMas = document.querySelector('#btn-cargar-mas');
const footerRateLimit = document.querySelector('#footer-rate-limit');

// Variables de estado globales para la paginación y búsqueda actual
let usuarioActual = '';
let paginaActual = 1;
let acumuladorRepos = [];

// 1. Petición modificada para retornar tanto los datos como las cabeceras (para x-ratelimit-remaining)
async function obtenerJSONConHeaders(url) {
  const res = await fetch(url);
  
  // Leer cabecera x-ratelimit-remaining y mostrarla en el pie de página (Actividad 3)
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining !== null) {
    footerRateLimit.textContent = `Peticiones de API restantes disponibles: ${remaining}`;
  }

  if (res.status === 404) throw new Error('Usuario no encontrado');
  if (res.status === 403) {
    throw new Error('Límite de peticiones alcanzado');
  }
  if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
  
  const datos = await res.json();
  return datos;
}

// 2. Pintar el perfil
function mostrarPerfil(u) {
  const img = document.createElement('img');
  img.src = u.avatar_url;
  img.alt = `Avatar de ${u.login}`;
  const nombre = document.createElement('h2');
  nombre.textContent = u.name ?? u.login;
  const datos = document.createElement('p');
  datos.textContent = `${u.public_repos} repositorios · ${u.followers} seguidores`;
  const enlace = document.createElement('a');
  enlace.href = u.html_url;
  enlace.target = '_blank';
  enlace.textContent = 'Ver en GitHub';
  const info = document.createElement('div');
  info.append(nombre, datos, enlace);
  perfil.replaceChildren(img, info);
  perfil.classList.remove('oculto');
}

// Resumen de lenguajes de todos los repositorios cargados hasta el momento
function mostrarResumenLenguajes(listaRepos) {
  const conteo = {};

  listaRepos.forEach(r => {
    const lang = r.language ?? 'Sin especificar';
    conteo[lang] = (conteo[lang] || 0) + 1;
  });

  divResumen.innerHTML = '<h3>Lenguajes más usados en esta vista:</h3>';
  const ulLang = document.createElement('ul');

  for (const [lenguaje, cantidad] of Object.entries(conteo)) {
    const li = document.createElement('li');
    li.textContent = `${lenguaje}: ${cantidad} repositorio(s)`;
    ulLang.append(li);
  }

  divResumen.replaceChildren(divResumen.querySelector('h3'), ulLang);
  divResumen.classList.remove('oculto');
}

// 3. Pintar la lista de repositorios (añade sin borrar los anteriores)
function mostrarRepos(lista) {
  repos.innerHTML = '';
  acumuladorRepos.forEach(r => {
    const a = document.createElement('a');
    a.href = r.html_url;
    a.target = '_blank';
    a.textContent = r.name;
    const li = document.createElement('li');
    const lenguaje = r.language ?? 'sin lenguaje';
    li.append(a, ` - ${lenguaje} - ★ ${r.stargazers_count}`);
    repos.append(li);
  });
  titulo.classList.remove('oculto');
  mostrarResumenLenguajes(acumuladorRepos);
}

// Función para cargar más repositorios mediante el botón (Actividad 3)
async function cargarMasRepositorios() {
  paginaActual++;
  const criterioOrden = selectOrden.value; 

  const params = new URLSearchParams({ 
    sort: criterioOrden, 
    per_page: 5,
    page: paginaActual 
  });

  try {
    btnCargarMas.disabled = true;
    btnCargarMas.textContent = 'Cargando...';

    const nuevosRepos = await obtenerJSONConHeaders(`${API}/users/${usuarioActual}/repos?${params}`);

    // Si la API devuelve menos de 5 resultados, se oculta el botón (Actividad 3)
    if (nuevosRepos.length < 5) {
      btnCargarMas.classList.add('oculto');
    } else {
      btnCargarMas.classList.remove('oculto');
    }

    if (nuevosRepos.length > 0) {
      acumuladorRepos = acumuladorRepos.concat(nuevosRepos);
      mostrarRepos(acumuladorRepos);
    } else {
      btnCargarMas.classList.add('oculto');
    }
  } catch (error) {
    estado.className = 'error';
    estado.textContent = error.message;
  } finally {
    btnCargarMas.disabled = false;
    btnCargarMas.textContent = 'Cargar más';
  }
}

// 4. Evento submit: búsqueda inicial
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  usuarioActual = encodeURIComponent(input.value.trim());
  if (!usuarioActual) return;

  paginaActual = 1;
  acumuladorRepos = [];
  const criterioOrden = selectOrden.value; 

  const params = new URLSearchParams({ 
    sort: criterioOrden, 
    per_page: 5,
    page: paginaActual 
  });

  boton.disabled = true;
  estado.className = '';
  estado.textContent = 'Buscando...';
  btnCargarMas.classList.add('oculto');

  try {
    const [datosUsuario, datosRepos] = await Promise.all([
      obtenerJSONConHeaders(`${API}/users/${usuarioActual}`),
      obtenerJSONConHeaders(`${API}/users/${usuarioActual}/repos?${params}`)
    ]);

    mostrarPerfil(datosUsuario);
    
    acumuladorRepos = datosRepos;
    mostrarRepos(acumuladorRepos);

    // Si la página inicial trae exactamente 5 (o más), mostramos el botón para ver si hay más
    if (datosRepos.length === 5) {
      btnCargarMas.classList.remove('oculto');
    } else {
      btnCargarMas.classList.add('oculto');
    }

    estado.textContent = '';
  } catch (error) {
    perfil.classList.add('oculto');
    titulo.classList.add('oculto');
    divResumen.classList.add('oculto');
    repos.innerHTML = '';
    btnCargarMas.classList.add('oculto');
    estado.className = 'error';
    estado.textContent = error.message;
  } finally {
    boton.disabled = false;
  }
});

// Evento para el botón de Cargar más
btnCargarMas.addEventListener('click', cargarMasRepositorios);