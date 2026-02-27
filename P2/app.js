// ─────────────────────────────────────────────
//  VOICEPLAYER — app.js
//  SpeechRecognition + SpeechSynthesis + Tilt
// ─────────────────────────────────────────────

// ── Referencias al DOM ───────────────────────
const video      = document.getElementById('video');
const btnMic     = document.getElementById('btn-mic');
const micDot     = document.getElementById('mic-dot');
const micLabel   = document.getElementById('mic-label');
const flash      = document.getElementById('flash');
const flashIcon  = document.getElementById('flash-icon');
const statEstado = document.getElementById('stat-estado');
const statVol    = document.getElementById('stat-vol');
const statTiempo = document.getElementById('stat-tiempo');
const volBar     = document.getElementById('vol-bar');
const logList    = document.getElementById('log-list');
const tiltCursor = document.getElementById('tilt-cursor');

// ── Estado ───────────────────────────────────
let recognizing   = false;  // ¿Está el micrófono activo?
let tiltBloqueado = false;  // Debounce para no disparar el gesto 100 veces por segundo

// ── Actualizar tiempo del video continuamente ─
video.addEventListener('timeupdate', () => {
  const t = Math.floor(video.currentTime);
  const m = Math.floor(t / 60);
  const s = String(t % 60).padStart(2, '0');
  statTiempo.textContent = `${m}:${s}`;
});

// ─────────────────────────────────────────────
//  1. SPEECH RECOGNITION API
// ─────────────────────────────────────────────

// Verificamos soporte — Chrome en Android lo tiene, Safari no siempre
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SR) {
  agregarLog('SpeechRecognition no soportado en este navegador', true);
  hablar('Tu navegador no soporta reconocimiento de voz. Usa Chrome.');
}

let recognition;

if (SR) {
  recognition = new SR();
  recognition.lang           = 'es-ES'; // Español
  recognition.continuous     = false;   // Escucha una frase y para
  recognition.interimResults = false;   // Solo resultados finales, no parciales

  // El micrófono empezó a escuchar
  recognition.onstart = () => {
    recognizing = true;
    micDot.classList.add('active');
    micLabel.textContent = 'ESCUCHANDO';
    btnMic.classList.add('active');
  };

  // Recibimos un resultado de voz
  recognition.onresult = (e) => {
    const texto = e.results[0][0].transcript.toLowerCase().trim();
    console.log('Reconocido:', texto);
    procesarComando(texto);
  };

  // El reconocimiento terminó (por fin de frase o por stop())
  recognition.onend = () => {
    recognizing = false;
    micDot.classList.remove('active');
    micLabel.textContent = 'ESPERANDO';
    btnMic.classList.remove('active');
  };

  // Error durante el reconocimiento
  recognition.onerror = (e) => {
    console.error('Error SpeechRecognition:', e.error);
    agregarLog(`Error micrófono: ${e.error}`, true);
    recognizing = false;
    micDot.classList.remove('active');
    micLabel.textContent = 'ERROR';
    btnMic.classList.remove('active');
  };
}

// Botón para activar / desactivar escucha
btnMic.addEventListener('click', () => {
  if (!SR) {
    alert('Tu navegador no soporta SpeechRecognition. Usa Chrome en Android.');
    return;
  }
  if (recognizing) {
    recognition.stop();
  } else {
    recognition.start();
  }
});

// ─────────────────────────────────────────────
//  2. PROCESAR COMANDOS DE VOZ
// ─────────────────────────────────────────────

function procesarComando(texto) {
  // Usamos includes() para ser tolerantes con frases largas:
  // "por favor reproducir el video" también funcionará
  if (texto.includes('reproducir') || texto.includes('play') || texto.includes('iniciar')) {
    cmdReproducir();

  } else if (texto.includes('pausar') || texto.includes('pausa') || texto.includes('detener')) {
    cmdPausar();

  } else if (texto.includes('subir') || texto.includes('sube') || texto.includes('aumentar')) {
    cmdSubirVolumen();

  } else if (texto.includes('bajar') || texto.includes('baja') || texto.includes('reducir')) {
    cmdBajarVolumen();

  } else {
    // Comando no reconocido → feedback visual + voz
    cmdNoReconocido(texto);
  }
}

// ─── Funciones de cada comando ────────────────

function cmdReproducir() {
  video.play();
  statEstado.textContent = 'PLAY ▶';
  mostrarFlash('▶', false);
  hablar('Reproduciendo');
  agregarLog('"REPRODUCIR" → video iniciado');
}

function cmdPausar() {
  video.pause();
  statEstado.textContent = 'PAUSADO ‖';
  mostrarFlash('‖', false);
  hablar('Pausado');
  agregarLog('"PAUSAR" → video pausado');
}

function cmdSubirVolumen() {
  // Subimos 20%, sin pasar de 1 (100%)
  video.volume = Math.min(1, video.volume + 0.2);
  actualizarVolUI();
  mostrarFlash('▲', false);
  hablar('Volumen subido');
  agregarLog(`"SUBIR" → volumen ${Math.round(video.volume * 100)}%`);
}

function cmdBajarVolumen() {
  // Bajamos 20%, sin pasar de 0 (silencio)
  video.volume = Math.max(0, video.volume - 0.2);
  actualizarVolUI();
  mostrarFlash('▼', false);
  hablar('Volumen bajado');
  agregarLog(`"BAJAR" → volumen ${Math.round(video.volume * 100)}%`);
}

function cmdNoReconocido(texto) {
  // Flash rojo de error
  mostrarFlash('?', true);

  // Feedback por voz: el navegador habla y explica los comandos disponibles
  hablar(`No reconocí "${texto}". Los comandos disponibles son: reproducir, pausar, subir y bajar.`);

  // Log con clase error
  agregarLog(`No reconocido: "${texto}"`, true);
}

// ─────────────────────────────────────────────
//  3. SPEECH SYNTHESIS API (voz de salida)
// ─────────────────────────────────────────────

function hablar(texto) {
  // Cancelamos cualquier voz anterior para no acumular mensajes
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(texto);
  utterance.lang  = 'es-ES'; // Voz en español
  utterance.rate  = 1.1;     // Velocidad ligeramente rápida
  utterance.pitch = 1;       // Tono normal

  window.speechSynthesis.speak(utterance);
}

// ─────────────────────────────────────────────
//  4. MOTION GESTURES — DeviceOrientation API
//     Inclinar izquierda → retroceder 10s
//     Inclinar derecha   → adelantar 10s
// ─────────────────────────────────────────────

// En iOS 13+ necesitamos pedir permiso explícito para el giroscopio
function activarTilt() {
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    // Safari iOS 13+: hay que pedirlo desde un gesto de usuario
    DeviceOrientationEvent.requestPermission()
      .then(respuesta => {
        if (respuesta === 'granted') {
          window.addEventListener('deviceorientation', onTilt);
          agregarLog('Permiso de orientación concedido');
        } else {
          agregarLog('Permiso de orientación denegado', true);
        }
      })
      .catch(err => agregarLog('Error al pedir permiso de orientación', true));
  } else {
    // Android y navegadores sin restricción de permiso
    window.addEventListener('deviceorientation', onTilt);
  }
}

// Llamamos a activarTilt cuando el usuario pulsa el botón mic (gesto de usuario)
// para que iOS nos permita pedir el permiso de orientación
btnMic.addEventListener('click', activarTilt, { once: true });

function onTilt(e) {
  // gamma = rotación alrededor del eje Z (inclinación izquierda/derecha)
  // Va de -90 (izquierda) a +90 (derecha)
  const gamma = e.gamma;
  if (gamma === null) return;

  // Movemos el cursor visual proporcionalmente al tilt
  // Mapeamos gamma (-90..90) al ancho del indicador (0%..100%)
  const pct = ((gamma + 90) / 180) * 100;
  tiltCursor.style.left = `${Math.min(100, Math.max(0, pct))}%`;

  // Solo actuamos si el gesto supera 35 grados y no estamos en debounce
  if (!tiltBloqueado) {
    if (gamma > 35) {
      // Inclinación derecha → adelantar 10 segundos
      cmdAdelantar();
    } else if (gamma < -35) {
      // Inclinación izquierda → retroceder 10 segundos
      cmdRetroceder();
    }
  }
}

function cmdAdelantar() {
  video.currentTime = Math.min(video.duration, video.currentTime + 10);
  mostrarFlash('▶▶', false);
  hablar('Adelantando 10 segundos');
  agregarLog('TILT DERECHA → adelanta 10s');
  bloquearTilt();
}

function cmdRetroceder() {
  video.currentTime = Math.max(0, video.currentTime - 10);
  mostrarFlash('◀◀', false);
  hablar('Retrocediendo 10 segundos');
  agregarLog('TILT IZQUIERDA → retrocede 10s');
  bloquearTilt();
}

// Bloquea el tilt 1.5 segundos para evitar que un gesto largo dispare muchas veces
function bloquearTilt() {
  tiltBloqueado = true;
  setTimeout(() => { tiltBloqueado = false; }, 1500);
}

// ─────────────────────────────────────────────
//  HELPERS DE UI
// ─────────────────────────────────────────────

// Flash grande en el centro del video
function mostrarFlash(icono, esError) {
  flashIcon.textContent = icono;
  flash.classList.remove('show', 'error');

  // Forzamos reflow para que la animación se reinicie aunque ya esté visible
  void flash.offsetWidth;

  if (esError) flash.classList.add('error');
  flash.classList.add('show');
}

// Actualiza la barra y el texto de volumen
function actualizarVolUI() {
  const pct = Math.round(video.volume * 100);
  statVol.textContent = `${pct}%`;
  volBar.style.width  = `${pct}%`;
}

// Añade una línea al log de comandos (máximo 3 visibles)
function agregarLog(mensaje, esError = false) {
  const ahora = new Date();
  const ts = `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}:${String(ahora.getSeconds()).padStart(2,'0')}`;

  const li = document.createElement('li');
  if (esError) li.classList.add('error');
  li.innerHTML = `<span class="ts">${ts}</span><span class="cmd">${mensaje}</span>`;

  // Insertamos al principio para que lo más reciente esté arriba
  logList.insertBefore(li, logList.firstChild);

  // Mantenemos solo las 3 últimas entradas
  while (logList.children.length > 3) {
    logList.removeChild(logList.lastChild);
  }
}