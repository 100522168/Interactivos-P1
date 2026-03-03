# Control de video por voz y gestos

Prototipo de aplicación web que permite controlar un video sin usar botones, 
usando la voz y los movimientos del dispositivo.

## Funcionalidades

- **Reproducir**: di "reproducir" para iniciar el video
- **Pausar**: di "pausar" para pausar el video
- **Subir volumen**: di "subir" para aumentar el volumen
- **Bajar volumen**: di "bajar" para reducir el volumen
- **Adelantar**: inclina el móvil hacia la derecha para adelantar 2 segundos
- **Retroceder**: inclina el móvil hacia la izquierda para retroceder 2 segundos

## Tecnologías usadas

- SpeechRecognition API: reconoce los comandos de voz del usuario
- SpeechSynthesis API: responde con voz cuando un comando no se reconoce
- DeviceOrientation API: detecta la inclinación del móvil para adelantar/retroceder

## Archivos

- index.html — estructura y estilos de la interfaz
- app.js — toda la lógica de voz, síntesis y gestos

## Cómo usarlo

Abrir index.html desde Chrome en el móvil y pulsar el botón del micrófono.