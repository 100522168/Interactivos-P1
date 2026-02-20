// ─── ELEMENTOS DEL DOM ───────────────────────────────────────
// Obtenemos referencias a todos los elementos que vamos a manipular
const bola = document.getElementById('bola');
const destino = document.getElementById('destino');
const campo = document.getElementById('campo');
const datos = document.getElementById('datos');
const estado = document.getElementById('estado');

// ─── POSICIÓN DE LA BOLA ─────────────────────────────────────
let bolaPosX = 50; // Posición horizontal inicial de la bola (50% = centro)
let bolaPosY = 50; // Posición vertical inicial de la bola (50% = centro)

// ─── POSICIÓN DEL DESTINO (aleatoria) ────────────────────────
// Generamos una posición aleatoria entre 20% y 80% para que no quede en los bordes
const destinoX = 20 + Math.random() * 60;
const destinoY = 20 + Math.random() * 60;
destino.style.left = destinoX + '%'; // Aplicamos posición horizontal al destino
destino.style.top = destinoY + '%';  // Aplicamos posición vertical al destino

// ─── POSICIÓN INICIAL DE LA BOLA ─────────────────────────────
bola.style.left = bolaPosX + '%'; // Colocamos la bola horizontalmente
bola.style.top = bolaPosY + '%';  // Colocamos la bola verticalmente

// ─── CONFIGURACIÓN ───────────────────────────────────────────
const SENSIBILIDAD = 0.5;   // Cuánto se mueve la bola por cada grado de inclinación
const RADIO_VICTORIA = 8;   // Distancia en % para considerar que llegó al destino
let ganado = false;          // Controla si el juego ya ha sido ganado

// ─── FUNCIÓN PRINCIPAL: mover la bola ────────────────────────
function moverBola(pitch, roll) {
  if (ganado) return; // Si ya ganó, no hacemos nada más

  // Roll (inclinación lateral) mueve la bola horizontalmente
  bolaPosX += roll * SENSIBILIDAD;
  // Pitch (inclinación adelante/atrás) mueve la bola verticalmente
  bolaPosY += pitch * SENSIBILIDAD;

  // Limitamos la posición para que la bola no salga del campo
  bolaPosX = Math.max(5, Math.min(95, bolaPosX));
  bolaPosY = Math.max(5, Math.min(95, bolaPosY));

  // Actualizamos la posición visual de la bola en el DOM
  bola.style.left = bolaPosX + '%';
  bola.style.top = bolaPosY + '%';

  // Mostramos los valores de pitch y roll en pantalla
  datos.textContent = `Pitch: ${pitch.toFixed(1)}° | Roll: ${roll.toFixed(1)}°`;

  // Calculamos la distancia entre la bola y el destino usando Pitágoras
  const distX = bolaPosX - destinoX;
  const distY = bolaPosY - destinoY;
  const distancia = Math.sqrt(distX * distX + distY * distY);

  // Si la distancia es menor que el radio de victoria, el jugador gana
  if (distancia < RADIO_VICTORIA) {
    ganado = true;
    bola.classList.add('ganando');           // Cambia el color de la bola a verde
    estado.textContent = '¡Has llegado al destino!';
    estado.style.color = '#00ff64';          // Cambia el texto a verde
  }
}

// ─── ACELERÓMETRO (móvil) ────────────────────────────────────
if (window.DeviceMotionEvent) { // Comprobamos si el dispositivo tiene acelerómetro

  // iOS 13+ requiere pedir permiso explícitamente al usuario
  if (typeof DeviceMotionEvent.requestPermission === 'function') {

    // Creamos un botón para solicitar el permiso
    const btnPermiso = document.createElement('button');
    btnPermiso.textContent = 'Activar acelerómetro';
    btnPermiso.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      padding: 15px 25px; font-size: 18px; background: #0f3460;
      color: white; border: none; border-radius: 10px; cursor: pointer; z-index: 999;
    `;
    document.body.appendChild(btnPermiso); // Añadimos el botón al HTML

    // Cuando el usuario pulsa el botón, pedimos permiso
    btnPermiso.addEventListener('click', () => {
      DeviceMotionEvent.requestPermission().then(permiso => {
        if (permiso === 'granted') {
          btnPermiso.remove();     // Quitamos el botón si el permiso fue concedido
          activarAcelerometro();   // Activamos el acelerómetro
        } else {
          estado.textContent = 'Permiso denegado'; // Mostramos error si se denegó
        }
      });
    });

  } else {
    // Android y otros navegadores no necesitan permiso explícito
    activarAcelerometro();
  }

} else {
  // Si el dispositivo no tiene acelerómetro, usamos el teclado como alternativa
  estado.textContent = 'Tu dispositivo no soporta el acelerómetro';
  activarTeclado();
}

// ─── ACTIVAR ACELERÓMETRO ────────────────────────────────────
function activarAcelerometro() {
  // Escuchamos el evento devicemotion que nos da los datos del acelerómetro
  window.addEventListener('devicemotion', function (e) {
    const acc = e.accelerationIncludingGravity; // Aceleración incluyendo la gravedad
    if (!acc) return; // Si no hay datos, salimos

    const pitch = acc.y; // Inclinación adelante/atrás (eje Y)
    const roll = acc.x;  // Inclinación izquierda/derecha (eje X)

    moverBola(pitch, roll); // Movemos la bola con los datos del acelerómetro
  });

  estado.textContent = 'Lleva la bola al círculo verde';
}

// ─── FALLBACK: controlar con teclado en el PC ─────────────────
function activarTeclado() {
  estado.textContent = '⌨️ Usa las flechas del teclado para mover la bola';

  // Escuchamos las teclas de flecha del teclado
  window.addEventListener('keydown', function (e) {
    let pitch = 0, roll = 0;
    if (e.key === 'ArrowUp')    pitch = -2; // Flecha arriba: mueve hacia arriba
    if (e.key === 'ArrowDown')  pitch =  2; // Flecha abajo: mueve hacia abajo
    if (e.key === 'ArrowLeft')  roll  = -2; // Flecha izquierda: mueve a la izquierda
    if (e.key === 'ArrowRight') roll  =  2; // Flecha derecha: mueve a la derecha
    moverBola(pitch, roll); // Movemos la bola con los valores del teclado
  });
}
