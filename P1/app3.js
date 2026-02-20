const imagen = document.getElementById('imagen');

let escalaActual = 1;
let rotacionActual = 0;
let distanciaInicial = null;
let anguloInicial = null;

imagen.addEventListener('touchstart', onTouchStart);
imagen.addEventListener('touchmove', onTouchMove, { passive: false });
imagen.addEventListener('touchend', onTouchEnd);

function onTouchStart(e) {
  if (e.touches.length === 2) {
    distanciaInicial = getDistancia(e.touches[0], e.touches[1]);
    anguloInicial = getAngulo(e.touches[0], e.touches[1]);
  }
}

function onTouchMove(e) {
  e.preventDefault();
  if (e.touches.length === 2) {
    const distanciaActual = getDistancia(e.touches[0], e.touches[1]);
    const anguloActual = getAngulo(e.touches[0], e.touches[1]);

    const escala = escalaActual * (distanciaActual / distanciaInicial);
    const rotacion = rotacionActual + (anguloActual - anguloInicial);

    imagen.style.transform = `scale(${escala}) rotate(${rotacion}deg)`;
  }
}

function onTouchEnd(e) {
  if (distanciaInicial !== null) {
    const distanciaFinal = getDistancia(
      e.changedTouches[0],
      e.changedTouches[1] || e.changedTouches[0]
    );
    const anguloFinal = getAngulo(
      e.changedTouches[0],
      e.changedTouches[1] || e.changedTouches[0]
    );

    escalaActual = escalaActual * (distanciaFinal / distanciaInicial);
    rotacionActual = rotacionActual + (anguloFinal - anguloInicial);

    distanciaInicial = null;
    anguloInicial = null;
  }
}

function getDistancia(touch1, touch2) {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getAngulo(touch1, touch2) {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}