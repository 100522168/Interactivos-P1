Práctica voluntaria creada por: Celia Sánchez y Estela de la Dueña 
# Contador de flexiones con heurísticas

Aplicación web que detecta y cuenta flexiones en tiempo real usando la cámara,
sin sensores físicos. Analiza la postura del usuario frame a frame mediante
visión por computador.

## Funcionalidades

- **Detectar postura**: reconoce si el usuario está en posición ARRIBA o ABAJO
- **Contar repeticiones**: suma +1 cada vez que se completa el ciclo ABAJO → ARRIBA
- **Visualizar ángulo**: muestra en tiempo real el ángulo del codo sobre el vídeo
- **Log de eventos**: registra cada cambio de postura y repetición con timestamp
- **Resetear**: reinicia el contador en cualquier momento

## Heurística usada

- Ángulo codo > 150° → postura ARRIBA (brazos extendidos)
- Ángulo codo < 90° → postura ABAJO (pecho cerca del suelo)
- Transición ABAJO → ARRIBA = +1 repetición

## Tecnologías usadas

- MediaPipe Pose: detecta 33 landmarks del cuerpo en tiempo real
- Canvas API: dibuja el esqueleto y anota el ángulo sobre el vídeo
- JavaScript (vanilla): lógica de heurísticas, máquina de estados y contador
