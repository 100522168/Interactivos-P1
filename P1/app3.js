// Obtenemos la referencia al elemento imagen del DOM
const imagen = document.getElementById('imagen');

// Escala actual de la imagen (1 = tamaño original)
let escalaActual = 1;
// Rotación actual de la imagen en grados
let rotacionActual = 0;
// Distancia entre los dos dedos al inicio del gesto
let distanciaInicial = null;
// Ángulo entre los dos dedos al inicio del gesto
let anguloInicial = null;

// Escuchamos cuando el usuario pone los dedos en la imagen
imagen.addEventListener('touchstart', onTouchStart);
// Escuchamos cuando el usuario mueve los dedos (passive:false permite usar preventDefault)
imagen.addEventListener('touchmove', onTouchMove, { passive: false });
// Escuchamos cuando el usuario levanta los dedos de la imagen
imagen.addEventListener('touchend', onTouchEnd);

// Se ejecuta cuando el usuario toca la pantalla
function onTouchStart(e) {
  // Solo actuamos si hay exactamente 2 dedos en pantalla
  if (e.touches.length === 2) {
    // Guardamos la distancia inicial entre los dos dedos
    distanciaInicial = getDistancia(e.touches[0], e.touches[1]);
    // Guardamos el ángulo inicial entre los dos dedos
    anguloInicial = getAngulo(e.touches[0], e.touches[1]);
  }
}

// Se ejecuta continuamente mientras el usuario mueve los dedos
function onTouchMove(e) {
  // Evita el comportamiento por defecto del navegador (scroll, zoom nativo...)
  e.preventDefault();
  // Solo actuamos si hay exactamente 2 dedos en pantalla
  if (e.touches.length === 2) {
    // Calculamos la distancia actual entre los dos dedos
    const distanciaActual = getDistancia(e.touches[0], e.touches[1]);
    // Calculamos el ángulo actual entre los dos dedos
    const anguloActual = getAngulo(e.touches[0], e.touches[1]);

    // La nueva escala es proporcional al cambio de distancia entre dedos
    const escala = escalaActual * (distanciaActual / distanciaInicial);
    // La nueva rotación es la diferencia entre el ángulo actual e inicial
    const rotacion = rotacionActual + (anguloActual - anguloInicial);

    // Aplicamos zoom y rotación a la imagen con transformaciones CSS
    imagen.style.transform = `scale(${escala}) rotate(${rotacion}deg)`;
  }
}

// Se ejecuta cuando el usuario levanta los dedos
function onTouchEnd(e) {
  // Solo actuamos si había un gesto activo
  if (distanciaInicial !== null) {
    // Calculamos la distancia final (si solo queda 1 dedo, usamos ese mismo dos veces)
    const distanciaFinal = getDistancia(
      e.changedTouches[0],
      e.changedTouches[1] || e.changedTouches[0]
    );
    // Calculamos el ángulo final
    const anguloFinal = getAngulo(
      e.changedTouches[0],
      e.changedTouches[1] || e.changedTouches[0]
    );

    // Guardamos la escala final para que el próximo gesto parta desde aquí
    escalaActual = escalaActual * (distanciaFinal / distanciaInicial);
    // Guardamos la rotación final para que el próximo gesto parta desde aquí
    rotacionActual = rotacionActual + (anguloFinal - anguloInicial);

    // Reseteamos los valores iniciales hasta el próximo gesto
    distanciaInicial = null;
    anguloInicial = null;
  }
}

// Calcula la distancia entre dos puntos táctiles usando el teorema de Pitágoras
function getDistancia(touch1, touch2) {
  const dx = touch2.clientX - touch1.clientX; // Diferencia horizontal
  const dy = touch2.clientY - touch1.clientY; // Diferencia vertical
  return Math.sqrt(dx * dx + dy * dy); // Distancia euclidiana
}

// Calcula el ángulo en grados entre dos puntos táctiles
function getAngulo(touch1, touch2) {
  const dx = touch2.clientX - touch1.clientX; // Diferencia horizontal
  const dy = touch2.clientY - touch1.clientY; // Diferencia vertical
  return Math.atan2(dy, dx) * (180 / Math.PI); // Convertimos radianes a grados
}