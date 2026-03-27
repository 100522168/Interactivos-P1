// Importa pipeline desde CDN con ES Modules
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.1";

// --- Constantes de configuración ---
const SAMPLE_RATE     = 16000; // AST espera audio a 16kHz; es el sample rate estándar para modelos de audio
const CHUNK_DURATION  = 3;     // Segundos de audio que se capturan por ciclo de clasificación
const TOP_K           = 5;     // Cuántas categorías mostrar en los resultados

// --- Referencias al DOM ---
const statusSpan         = document.getElementById("status");
const startBtn           = document.getElementById("start-btn");
const stopBtn            = document.getElementById("stop-btn");
const resultsList        = document.getElementById("results-list");
const streamingIndicator = document.getElementById("streaming-indicator");
const canvas             = document.getElementById("visualizer");
const canvasCtx          = canvas.getContext("2d"); // Contexto 2D del canvas para dibujar la onda

// --- Estado de la aplicación ---
let classifier    = null;  // Pipeline AST; se asigna cuando el modelo termina de cargar
let audioContext  = null;  // Web Audio API: gestiona el grafo de procesamiento de audio
let mediaStream   = null;  // Stream del micrófono obtenido con getUserMedia
let animationId   = null;  // ID del requestAnimationFrame del visualizador, para poder cancelarlo
let isListening   = false; // Flag que controla el bucle de captura

// ─────────────────────────────────────────────
// 1. CARGA DEL MODELO
// ─────────────────────────────────────────────

async function loadModel() {
  try {
    statusSpan.textContent = "Descargando modelo AST (~350MB)...";

    classifier = await pipeline(
      "audio-classification",              // Tarea: clasifica audio en categorías del dataset AudioSet
      "Xenova/ast-finetuned-audioset-10-10-0.4593", // Modelo AST fine-tuneado en AudioSet (527 categorías)
      { dtype: "fp32" }                    // Precisión completa: AST cuantizado pierde demasiada precisión
    );

    statusSpan.textContent = "Modelo listo";
    statusSpan.classList.add("ready");
    startBtn.disabled = false; // Habilita el botón de inicio ahora que el modelo está listo

  } catch (err) {
    statusSpan.textContent = "Error cargando modelo";
    console.error(err);
  }
}

// ─────────────────────────────────────────────
// 2. VISUALIZADOR DE ONDA (Web Audio API)
// ─────────────────────────────────────────────

function startVisualizer(stream) {
  audioContext = new AudioContext(); // Crea el contexto de audio (debe crearse tras un gesto del usuario por política del navegador)

  const source   = audioContext.createMediaStreamSource(stream); // Nodo fuente: el micrófono
  const analyser = audioContext.createAnalyser();                // Nodo analizador: extrae datos de frecuencia/amplitud
  analyser.fftSize = 256; // Tamaño de la FFT: determina la resolución del análisis de frecuencias

  source.connect(analyser); // Conecta micrófono → analizador (no conectamos a destination para no escucharnos)

  const bufferLength = analyser.frequencyBinCount; // frequencyBinCount = fftSize / 2 = 128 bins de frecuencia
  const dataArray    = new Uint8Array(bufferLength); // Array de 8 bits donde el analizador vuelca los datos

  // Función de dibujo que se llama en cada frame del navegador (~60fps)
  function draw() {
    animationId = requestAnimationFrame(draw); // Encola el siguiente frame; guarda el ID para poder cancelarlo

    analyser.getByteTimeDomainData(dataArray); // Rellena dataArray con la forma de onda en el dominio temporal

    // Limpia el canvas en cada frame
    canvasCtx.fillStyle = "#16213e";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    // Configuración de la línea de la onda
    canvasCtx.lineWidth   = 2;
    canvasCtx.strokeStyle = "#2196f3";
    canvasCtx.beginPath();

    const sliceWidth = canvas.width / bufferLength; // Anchura de cada segmento de la onda
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0; // Normaliza el valor de 0-255 a 0-2 (centro en 1.0)
      const y = (v / 2) * canvas.height; // Escala al alto del canvas

      if (i === 0) {
        canvasCtx.moveTo(x, y); // Primer punto: mueve el cursor sin dibujar
      } else {
        canvasCtx.lineTo(x, y); // Resto de puntos: traza la línea
      }
      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2); // Cierra la línea en el centro derecho
    canvasCtx.stroke(); // Renderiza la línea acumulada
  }

  draw(); // Arranca el bucle de animación
}

// ─────────────────────────────────────────────
// 3. CAPTURA Y CLASIFICACIÓN EN TIEMPO REAL
// ─────────────────────────────────────────────

async function startListening() {
  try {
    // Solicita acceso al micrófono; el navegador muestra el diálogo de permisos
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

    startVisualizer(mediaStream); // Arranca la visualización de la onda

    isListening = true;
    startBtn.disabled = true;  // No se puede iniciar dos veces
    stopBtn.disabled  = false; // Ahora sí se puede detener
    statusSpan.textContent = "Escuchando...";
    statusSpan.className   = "listening"; // Cambia el color del status a azul

    streamingIndicator.textContent = "● procesando"; // Indicador parpadeante en el título de resultados

    // Bucle de clasificación: captura CHUNK_DURATION segundos, clasifica, repite
    while (isListening) {
      const audioData = await captureAudioChunk(); // Captura un chunk de audio como Float32Array
      if (!isListening) break;                     // Comprueba si se ha parado mientras capturaba

      // Clasifica el chunk; top_k limita el número de categorías devueltas
      // El streaming aquí se implementa mostrando resultados en cada ciclo sin esperar a terminar
      const results = await classifier(audioData, { top_k: TOP_K });

      displayResults(results); // Actualiza la UI con los nuevos resultados inmediatamente
    }

  } catch (err) {
    // El error más común: el usuario deniega el permiso del micrófono
    statusSpan.textContent = "Error: permiso de micrófono denegado";
    console.error(err);
  }
}

// Captura CHUNK_DURATION segundos de audio del micrófono y los devuelve como Float32Array a 16kHz
function captureAudioChunk() {
  return new Promise((resolve) => {
    const chunkContext = new AudioContext({ sampleRate: SAMPLE_RATE }); // Contexto a 16kHz para que el modelo reciba el sample rate correcto
    const source       = chunkContext.createMediaStreamSource(mediaStream);
    const processor    = chunkContext.createScriptProcessor(4096, 1, 1); // ScriptProcessor: nodo que permite procesar audio con JS

    const samples = []; // Acumula los samples de audio durante el chunk

    // Se ejecuta cada vez que el buffer del procesador se llena (~4096 samples)
    processor.onaudioprocess = (e) => {
      // getChannelData(0): canal izquierdo (mono); devuelve Float32Array con valores -1.0 a 1.0
      samples.push(...e.inputBuffer.getChannelData(0));
    };

    source.connect(processor);          // Micrófono → procesador
    processor.connect(chunkContext.destination); // Procesador → salida (necesario para que onaudioprocess se dispare)

    // Tras CHUNK_DURATION segundos, para la captura y devuelve los datos acumulados
    setTimeout(() => {
      processor.disconnect();
      source.disconnect();
      chunkContext.close();
      resolve(new Float32Array(samples)); // Devuelve los samples como Float32Array, que es lo que espera el pipeline
    }, CHUNK_DURATION * 1000);
  });
}

// ─────────────────────────────────────────────
// 4. RENDERIZADO DE RESULTADOS (streaming visual)
// ─────────────────────────────────────────────

// Recibe el array de resultados [{label, score}, ...] y actualiza la UI en tiempo real
function displayResults(results) {
  resultsList.innerHTML = ""; // Limpia los resultados anteriores para mostrar los nuevos

  results.forEach((item) => {
    const percent = (item.score * 100).toFixed(1); // Convierte el score 0-1 a porcentaje con 1 decimal

    // Crea el contenedor de cada resultado
    const div = document.createElement("div");
    div.classList.add("result-item");

    // Fila superior: nombre de la categoría y score en porcentaje
    div.innerHTML = `
      <div class="result-label">
        <span>${item.label}</span>
        <span>${percent}%</span>
      </div>
      <div class="result-bar-container">
        <!-- El width de la barra es proporcional al score; la transición CSS anima el cambio entre ciclos -->
        <div class="result-bar" style="width: ${percent}%"></div>
      </div>
    `;

    resultsList.appendChild(div);
  });
}

// ─────────────────────────────────────────────
// 5. DETENER
// ─────────────────────────────────────────────

function stopListening() {
  isListening = false; // El flag hace que el while de startListening salga en el próximo ciclo

  // Detiene todos los tracks del stream del micrófono (libera el hardware y apaga el indicador del navegador)
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }

  // Cancela el bucle de animación del visualizador
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  // Cierra el AudioContext del visualizador para liberar recursos
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  // Limpia el canvas
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

  startBtn.disabled = false; // Permite volver a iniciar
  stopBtn.disabled  = true;
  statusSpan.textContent = "Modelo listo";
  statusSpan.className   = "ready";
  streamingIndicator.textContent = ""; // Elimina el indicador parpadeante
}

// ─────────────────────────────────────────────
// 6. EVENTOS Y ARRANQUE
// ─────────────────────────────────────────────

startBtn.addEventListener("click", startListening);
stopBtn.addEventListener("click", stopListening);

// Ajusta el tamaño del canvas al tamaño real del contenedor
// Sin esto el canvas tiene 300x150px por defecto y la onda se ve distorsionada
window.addEventListener("resize", () => {
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
});

// Dispara el resize inicial para que el canvas tenga el tamaño correcto desde el principio
window.dispatchEvent(new Event("resize"));

// Arranca la carga del modelo al cargar el script
loadModel();