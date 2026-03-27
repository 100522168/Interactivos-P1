// Importa pipeline desde CDN usando ES Modules, sin npm ni bundler
// La versión está fijada (3.4.1) para evitar breaking changes si la librería se actualiza
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.1";

// Array que mantiene el estado completo de la conversación (la "memoria" del chat)
// Se inicializa con el system prompt: define el comportamiento del modelo durante toda la sesión
// Este array se pasa entero al modelo en cada llamada para que tenga contexto acumulado
const conversationHistory = [
  {
    role: "system",
    content: "You are a helpful and friendly assistant. Answer concisely."
  }
];

// Referencias cacheadas al DOM: se guardan en constantes para no repetir querySelector en cada evento
const messagesDiv = document.getElementById("messages");
const userInput   = document.getElementById("user-input");
const sendBtn     = document.getElementById("send-btn");
const statusSpan  = document.getElementById("status");

// Variable que almacenará el pipeline una vez cargado
// Se declara con let fuera de la función async para que sea accesible desde sendMessage
let generator = null;

// Función async porque pipeline() descarga el modelo, lo deserializa y lo compila en ONNX
// Sería bloqueante si fuera síncrona
async function loadModel() {
  try {
    statusSpan.textContent = "Descargando modelo (~300MB, espera...)"; // Feedback al usuario durante la descarga

    generator = await pipeline(
      "text-generation",            // Tarea: determina qué arquitectura y cabeza de modelo se carga
      "onnx-community/Qwen2.5-0.5B-Instruct", // Modelo: 500M parámetros, fine-tuneado para chat con instrucciones
      { dtype: "q4" }               // Cuantización 4 bits: reduce el modelo de ~1GB a ~300MB con mínima pérdida de precisión
    );

    statusSpan.textContent = "Modelo listo";  // Actualiza el indicador de estado
    statusSpan.classList.add("ready");         // Cambia el color a verde vía CSS
    userInput.disabled = false;                // Habilita el textarea ahora que el modelo está listo
    sendBtn.disabled = false;                  // Habilita el botón de envío
    userInput.focus();                         // Mueve el foco al textarea para que el usuario pueda escribir directamente

  } catch (err) {
    statusSpan.textContent = "Error cargando modelo"; // Manejo de error: fallo de red, WebGPU no soportado, etc.
    console.error(err);
  }
}

// Factoría de mensajes: crea un div, le aplica clases CSS según el rol y lo inyecta en el contenedor
// Devuelve el div para poder modificarlo después (caso del div "Pensando..." que se actualiza con la respuesta real)
function addMessage(role, text, isThinking = false) {
  const div = document.createElement("div");  // Crea el elemento en memoria, aún no está en el DOM
  div.classList.add("message", role);          // Aplica .message y .user o .assistant según el rol
  if (isThinking) div.classList.add("thinking"); // Clase temporal de estado: reduce opacidad y pone cursiva
  div.textContent = text;                      // textContent en vez de innerHTML: evita XSS
  messagesDiv.appendChild(div);                // Inserta el div al final del contenedor de mensajes
  messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll al último mensaje
  return div;                                  // Retorna la referencia para poder mutarlo luego
}

async function sendMessage() {
  const text = userInput.value.trim(); // trim() evita enviar mensajes de solo espacios en blanco
  if (!text || !generator) return;     // Guard clause: sale si el input está vacío o el modelo no ha cargado

  addMessage("user", text);   // Muestra el mensaje del usuario en el chat inmediatamente
  userInput.value = "";        // Limpia el textarea
  sendBtn.disabled = true;     // Deshabilita controles durante la inferencia para evitar envíos concurrentes
  userInput.disabled = true;

  conversationHistory.push({ role: "user", content: text }); // Añade el mensaje al historial acumulado

  // Crea el div del assistant en estado "pensando" y guarda la referencia para actualizarlo después
  const thinkingDiv = addMessage("assistant", "Pensando...", true);

  try {
    // Llamada al modelo pasando el historial COMPLETO (no solo el último mensaje)
    // Así el modelo tiene contexto de toda la conversación anterior
    const output = await generator(conversationHistory, {
      max_new_tokens: 200,      // Techo de tokens generados: evita respuestas infinitas
      temperature: 0.7,         // Balance determinismo/creatividad: 0 = greedy, 1 = máxima aleatoriedad
      repetition_penalty: 1.1,  // Penaliza repetir tokens ya generados, reduce respuestas redundantes
      do_sample: true           // Activa muestreo estocástico; sin esto temperature no tiene efecto
    });

    // El modelo devuelve el historial completo + el nuevo mensaje generado
    // generated_text es un array de {role, content}; .at(-1) extrae el último elemento: la respuesta del assistant
    const response = output[0].generated_text.at(-1);
    const assistantText = response.content; // Solo nos interesa el texto, no el rol

    thinkingDiv.classList.remove("thinking"); // Elimina el estado temporal de "pensando"
    thinkingDiv.textContent = assistantText;  // Sustituye "Pensando..." por la respuesta real en el mismo div
    conversationHistory.push({ role: "assistant", content: assistantText }); // Añade la respuesta al historial para el próximo turno

  } catch (err) {
    thinkingDiv.textContent = "Error generando respuesta."; // Manejo de error visible en el chat
    console.error(err);
  }

  sendBtn.disabled = false;  // Re-habilita los controles para el siguiente mensaje
  userInput.disabled = false;
  userInput.focus();         // Devuelve el foco al textarea
}

// Evento de clic en el botón de envío
sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keydown", (e) => {
  // Enter sin Shift envía el mensaje; Shift+Enter inserta salto de línea en el textarea
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault(); // Evita que Enter inserte un \n antes de que se limpie el textarea
    sendMessage();
  }
});

// Arranca la carga del modelo al cargar el script
// No hay await aquí porque es el nivel superior del módulo; la UI ya muestra "Cargando..." al usuario
loadModel();