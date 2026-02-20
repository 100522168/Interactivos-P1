// ─── ELEMENTOS DEL DOM ───────────────────────────────────────
const bola = document.getElementById('bola');
const destino = document.getElementById('destino');
const campo = document.getElementById('campo');
const datos = document.getElementById('datos');
const estado = document.getElementById('estado');

// ─── POSICIÓN DE LA BOLA ─────────────────────────────────────
let bolaPosX = 50; // % horizontal
let bolaPosY = 50; // % vertical

// ─── POSICIÓN DEL DESTINO (aleatoria) ────────────────────────
const destinoX = 20 + Math.random() * 60; // entre 20% y 80%
const destinoY = 20 + Math.random() * 60;
destino.style.left = destinoX + '%';
destino.style.top = destinoY + '%';

// ─── POSICIÓN INICIAL DE LA BOLA ─────────────────────────────
bola.style.left = bolaPosX + '%';
bola.style.top = bolaPosY + '%';

// ─── CONFIGURACIÓN ───────────────────────────────────────────
const SENSIBILIDAD = 0.5;
const RADIO_VICTORIA = 8; // % de distancia para ganar
let ganado = false;

// ─── FUNCIÓN PRINCIPAL: mover la bola ────────────────────────
function moverBola(pitch, roll) {
  if (ganado) return;

  // Roll mueve horizontalmente, Pitch mueve verticalmente
  bolaPosX += roll * SENSIBILIDAD;
  bolaPosY += pitch * SENSIBILIDAD;

  // Limitar que no salga del campo
  bolaPosX = Math.max(5, Math.min(95, bolaPosX));
  bolaPosY = Math.max(5, Math.min(95, bolaPosY));

  // Actualizar posición visual
  bola.style.left = bolaPosX + '%';
  bola.style.top = bolaPosY + '%';

  // Mostrar datos en pantalla
  datos.textContent = `Pitch: ${pitch.toFixed(1)}° | Roll: ${roll.toFixed(1)}°`;

  // Comprobar si llegó al destino
  const distX = bolaPosX - destinoX;
  const distY = bolaPosY - destinoY;
  const distancia = Math.sqrt(distX * distX + distY * distY);

  if (distancia < RADIO_VICTORIA) {
    ganado = true;
    bola.classList.add('ganando');
    estado.textContent = '🎉 ¡Has llegado al destino!';
    estado.style.color = '#00ff64';
  }
}

// ─── ACELERÓMETRO (móvil) ────────────────────────────────────
if (window.DeviceMotionEvent) {

  // iOS 13+ requiere pedir permiso explícitamente
  if (typeof DeviceMotionEvent.requestPermission === 'function') {

    const btnPermiso = document.createElement('button');
    btnPermiso.textContent = '🎮 Activar acelerómetro';
    btnPermiso.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      padding: 15px 25px; font-size: 18px; background: #0f3460;
      color: white; border: none; border-radius: 10px; cursor: pointer; z-index: 999;
    `;
    document.body.appendChild(btnPermiso);

    btnPermiso.addEventListener('click', () => {
      DeviceMotionEvent.requestPermission().then(permiso => {
        if (permiso === 'granted') {
          btnPermiso.remove();
          activarAcelerometro();
        } else {
          estado.textContent = '❌ Permiso denegado';
        }
      });
    });

  } else {
    // Android y otros — no necesita permiso
    activarAcelerometro();
  }

} else {
  estado.textContent = '❌ Tu dispositivo no soporta el acelerómetro';
  activarTeclado(); // fallback con teclado para probar en PC
}

// ─── ACTIVAR ACELERÓMETRO ────────────────────────────────────
function activarAcelerometro() {
  window.addEventListener('devicemotion', function (e) {
    const acc = e.accelerationIncludingGravity;
    if (!acc) return;

    const pitch = acc.y; // inclinación adelante/atrás
    const roll = acc.x;  // inclinación izquierda/derecha

    moverBola(pitch, roll);
  });

  estado.textContent = '🎯 Lleva la bola al círculo verde';
}

// ─── FALLBACK: controlar con teclado en el PC ─────────────────
function activarTeclado() {
  estado.textContent = '⌨️ Usa las flechas del teclado para mover la bola';

  window.addEventListener('keydown', function (e) {
    let pitch = 0, roll = 0;
    if (e.key === 'ArrowUp')    pitch = -2;
    if (e.key === 'ArrowDown')  pitch =  2;
    if (e.key === 'ArrowLeft')  roll  = -2;
    if (e.key === 'ArrowRight') roll  =  2;
    moverBola(pitch, roll);
  });
}


