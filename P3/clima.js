// ============================================================
// PASO 1: RECONOCIMIENTO DE VOZ (SpeechRecognition API)
// ============================================================
// Comprobamos si el navegador soporta SpeechRecognition.
// Chrome lo llama webkitSpeechRecognition; Firefox aún no lo soporta.
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function iniciarEscucha() {
  // Si el navegador no soporta la API, avisamos y salimos
  if (!SpeechRecognition) {
    mostrarEstado('❌ Tu navegador no soporta reconocimiento de voz. Usa Chrome.', 'error');
    return;
  }

  // Creamos la instancia del reconocedor
  const reconocedor = new SpeechRecognition();
  reconocedor.lang = 'es-ES';         // Idioma: español de España
  reconocedor.continuous = false;     // Para después de detectar 1 frase
  reconocedor.interimResults = false; // Solo resultados finales (no borradores)

  // Activamos el estilo visual "escuchando" en el botón
  const btn = document.getElementById('micBtn');
  btn.classList.add('listening');
  document.getElementById('transcripcion').textContent = '';
  ocultarClima();
  mostrarEstado('<span class="spinner"></span> Escuchando…', 'loading');

  // Cuando el reconocedor recibe un resultado:
  // evento.results[0][0].transcript → el texto que reconoció
  reconocedor.onresult = (evento) => {
    const textoReconocido = evento.results[0][0].transcript.toLowerCase().trim();
    document.getElementById('transcripcion').textContent = `🗣️ "${textoReconocido}"`;

    // Comprobamos si el usuario dijo algo parecido a "¿cuál es el clima?"
    if (textoReconocido.includes('clima') || textoReconocido.includes('tiempo')) {
      obtenerUbicacion(); // → PASO 2
    } else {
      mostrarEstado('❌ No entendí. Di: "¿Cuál es el clima?"', 'error');
    }
  };

  // Si hay un error en el reconocimiento de voz
  reconocedor.onerror = (evento) => {
    btn.classList.remove('listening');
    const mensajes = {
      'no-speech':   '❌ No te escuché. Intenta de nuevo.',
      'not-allowed': '❌ Permiso de micrófono denegado.',
      'network':     '❌ Error de red en el reconocimiento.',
    };
    mostrarEstado(mensajes[evento.error] || `❌ Error: ${evento.error}`, 'error');
  };

  // Cuando termina de escuchar, quitamos el estilo "listening"
  reconocedor.onend = () => {
    btn.classList.remove('listening');
  };

  // ¡Empezamos a escuchar!
  reconocedor.start();
}


// ============================================================
// PASO 2: GEOLOCALIZACIÓN (navigator.geolocation)
// ============================================================
// Pedimos al navegador la posición GPS del usuario.
// El navegador le preguntará al usuario si acepta compartir su ubicación.
function obtenerUbicacion() {
  mostrarEstado('<span class="spinner"></span> Obteniendo ubicación GPS…', 'loading');

  // getCurrentPosition recibe 3 argumentos:
  //   1. Callback de ÉXITO  → recibe objeto "posicion" con las coordenadas
  //   2. Callback de ERROR  → recibe objeto "error" con el código de fallo
  //   3. Opciones           → timeout máximo de espera
  navigator.geolocation.getCurrentPosition(
    (posicion) => {
      const lat = posicion.coords.latitude;  // ej: 40.4168
      const lon = posicion.coords.longitude; // ej: -3.7038
      consultarClima(lat, lon);              // → PASO 3
    },
    (error) => {
      // Manejamos los distintos tipos de error de geolocalización
      const mensajes = {
        1: '❌ Permiso de ubicación denegado. Actívalo en el navegador.',
        2: '❌ No se pudo obtener tu posición.',
        3: '❌ Tiempo de espera agotado para la ubicación.',
      };
      mostrarEstado(mensajes[error.code] || '❌ Error de geolocalización.', 'error');
    },
    { timeout: 10000 } // Máximo 10 segundos para obtener la ubicación
  );
}


// ============================================================
// PASO 3: LLAMADA A LA API DE CLIMA (fetch + Open-Meteo)
// ============================================================
// Con latitud y longitud, llamamos a Open-Meteo.
// Es una API GRATUITA y sin API key.
//
// URL resultante ejemplo:
// https://api.open-meteo.com/v1/forecast?latitude=40.4168&longitude=-3.7038&current_weather=true
//
// Respuesta JSON esperada:
// {
//   current_weather: {
//     temperature: 18.5,        ← temperatura en °C
//     windspeed: 12.3,          ← viento en km/h
//     weathercode: 2,           ← código WMO del estado del cielo
//     time: "2024-01-15T14:00"  ← hora de la medición
//   }
// }
async function consultarClima(lat, lon) {
  mostrarEstado('<span class="spinner"></span> Consultando Open-Meteo…', 'loading');

  // Construimos la URL con las coordenadas del usuario
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

  try {
    // fetch() hace la petición HTTP GET a la API
    // Es asíncrona → usamos await para esperar la respuesta
    const respuesta = await fetch(url);

    // Comprobamos que el servidor respondió correctamente (código 200-299)
    if (!respuesta.ok) {
      throw new Error(`Error HTTP: ${respuesta.status}`);
    }

    // Convertimos la respuesta (texto JSON) a un objeto JavaScript
    const datos = await respuesta.json();

    // Pasamos los datos del clima a la función que los muestra
    mostrarClima(datos.current_weather, lat, lon);

  } catch (error) {
    // Capturamos cualquier error: red caída, respuesta inválida, etc.
    mostrarEstado(`❌ Error al consultar la API: ${error.message}`, 'error');
  }
}


// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

// Códigos WMO → descripción e icono emoji
// Open-Meteo usa los códigos estándar de la WMO (World Meteorological Organization)
function interpretarCodigo(code) {
  if (code === 0)               return { desc: 'Despejado',           icono: '☀️'  };
  if (code <= 2)                return { desc: 'Parcialmente nublado', icono: '⛅'  };
  if (code === 3)               return { desc: 'Nublado',              icono: '☁️'  };
  if (code >= 51 && code <= 67) return { desc: 'Lluvia',               icono: '🌧️'  };
  if (code >= 71 && code <= 77) return { desc: 'Nieve',                icono: '❄️'  };
  if (code >= 80 && code <= 82) return { desc: 'Chubascos',            icono: '🌦️'  };
  if (code >= 95)               return { desc: 'Tormenta',             icono: '⛈️'  };
  return { desc: 'Variable', icono: '🌤️' };
}

// Rellena la tarjeta HTML con los datos del clima y la hace visible
function mostrarClima(clima, lat, lon) {
  const { desc, icono } = interpretarCodigo(clima.weathercode);

  document.getElementById('wIcon').textContent   = icono;
  document.getElementById('wCoords').textContent = `📍 ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  document.getElementById('wDesc').textContent   = desc;
  document.getElementById('wTemp').innerHTML     = `${clima.temperature}<span class="stat-unit">°C</span>`;
  document.getElementById('wViento').innerHTML   = `${clima.windspeed}<span class="stat-unit">km/h</span>`;

  // Re-lanzamos la animación de entrada quitando y añadiendo la clase
  const card = document.getElementById('weatherCard');
  card.classList.remove('visible');
  void card.offsetWidth; // forzamos reflow para que la animación vuelva a correr
  card.classList.add('visible');

  mostrarEstado('✅ Datos obtenidos correctamente', 'ok');
}

// Oculta la tarjeta del clima
function ocultarClima() {
  document.getElementById('weatherCard').classList.remove('visible');
}

// Muestra mensajes de estado en el párrafo #estado
// tipo puede ser: 'loading', 'error', 'ok'
function mostrarEstado(mensaje, tipo = '') {
  const el = document.getElementById('estado');
  el.innerHTML = mensaje;
  el.className = tipo;
}