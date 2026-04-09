Estela de la Dueña Olivar y Celia Sánchez Cobo
Ejercicio 1 — Chat con IA
Interfaz de chat que mantiene historial de conversación. Usa onnx-community/Qwen2.5-0.5B-Instruct (500M parámetros, cuantizado a 4 bits) con el pipeline text-generation de Transformers.js. En cada turno se pasa el historial completo al modelo para que tenga contexto acumulado.
Ejercicio 2 — Clasificador AST
Captura audio del micrófono en chunks de 3 segundos y clasifica cada uno con Xenova/ast-finetuned-audioset-10-10-0.4593 (AudioSet, 527 categorías). Los resultados se actualizan en la UI tras cada chunk — eso es el streaming. Incluye visualizador de onda con Web Audio API.

Conceptos clave

Transformers.js — port de HuggingFace Transformers a JS; corre modelos en el navegador vía ONNX Runtime (WebAssembly/WebGPU)
Pipeline — abstracción que encapsula modelo + tokenizador; se inicializa con la tarea y el modelo
Cuantización — reduce el tamaño del modelo bajando la precisión de los pesos (fp32 → q4)