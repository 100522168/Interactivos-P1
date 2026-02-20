// ─── CONFIGURACIÓN ───────────────────────────────────────────
const DISTANCIA_ALERTA = 200; // Distancia en metros para lanzar la notificación

// ─── VARIABLES GLOBALES ──────────────────────────────────────
let marcadorDestino = null; // Almacena el marcador del destino puesto por el usuario
let marcadorUsuario = null; // Almacena el marcador que muestra la posición del usuario
let destinoLatLng = null;   // Almacena las coordenadas del destino elegido
let notificado = false;     // Evita que la notificación se repita una vez lanzada

// ─── INICIALIZAR EL MAPA ─────────────────────────────────────
// Creamos el mapa centrado en Madrid con zoom 13
const map = L.map('map').setView([40.416775, -3.703790], 13);

// Añadimos la capa de tiles de OpenStreetMap para ver el mapa
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors' // Créditos obligatorios de OpenStreetMap
}).addTo(map);

// ─── PEDIR PERMISO PARA NOTIFICACIONES ───────────────────────
// Comprobamos si el navegador soporta notificaciones y pedimos permiso al usuario
if ('Notification' in window) {
  Notification.requestPermission();
}

// ─── CLICK EN EL MAPA: establecer destino ────────────────────
// Escuchamos el evento click sobre el mapa para que el usuario elija el destino
map.on('click', function (e) {
  destinoLatLng = e.latlng; // Guardamos las coordenadas donde el usuario hizo click
  notificado = false;        // Reseteamos la notificación para el nuevo destino

  // Si ya había un marcador de destino anterior, lo eliminamos del mapa
  if (marcadorDestino) {
    map.removeLayer(marcadorDestino);
  }

  // Creamos un nuevo marcador en el punto elegido con un popup informativo
  marcadorDestino = L.marker(destinoLatLng)
    .addTo(map)
    .bindPopup('🎯 Destino seleccionado')
    .openPopup();

  // Actualizamos el panel de info con las coordenadas del destino y el botón de borrar
  document.getElementById('info').innerHTML =
    `🎯 Destino: ${destinoLatLng.lat.toFixed(5)}, ${destinoLatLng.lng.toFixed(5)}
     <br><button id="btn-clear">Borrar destino</button>`;

  // Asignamos el evento al nuevo botón de borrar que acabamos de crear
  document.getElementById('btn-clear').addEventListener('click', borrarDestino);
});

// ─── BOTÓN BORRAR ─────────────────────────────────────────────
// Asignamos el evento al botón de borrar que ya existe en el HTML inicial
document.getElementById('btn-clear').addEventListener('click', borrarDestino);

// Función que borra el destino del mapa y resetea el estado
function borrarDestino() {
  if (marcadorDestino) map.removeLayer(marcadorDestino); // Eliminamos el marcador del mapa
  marcadorDestino = null;  // Reseteamos la variable del marcador
  destinoLatLng = null;    // Reseteamos las coordenadas del destino
  notificado = false;      // Reseteamos el estado de notificación

  // Restauramos el panel de info al estado inicial
  document.getElementById('info').innerHTML =
    '📍 Toca el mapa para establecer tu destino <br><button id="btn-clear">Borrar destino</button>';
  // Volvemos a asignar el evento al botón restaurado
  document.getElementById('btn-clear').addEventListener('click', borrarDestino);
}

// ─── SEGUIMIENTO DE UBICACIÓN EN TIEMPO REAL ─────────────────
// Comprobamos si el navegador soporta geolocalización
if ('geolocation' in navigator) {
  // watchPosition rastrea la posición continuamente (no solo una vez)
  navigator.geolocation.watchPosition(
    function (pos) {
      const lat = pos.coords.latitude;  // Latitud actual del usuario
      const lng = pos.coords.longitude; // Longitud actual del usuario
      const userLatLng = L.latLng(lat, lng); // Creamos un objeto LatLng de Leaflet

      // Si ya existe el marcador del usuario, solo actualizamos su posición
      if (marcadorUsuario) {
        marcadorUsuario.setLatLng(userLatLng);
      } else {
        // Si no existe, lo creamos como un círculo azul en el mapa
        marcadorUsuario = L.circleMarker(userLatLng, {
          radius: 10,
          color: 'blue',
          fillColor: '#3388ff',
          fillOpacity: 0.8
        }).addTo(map).bindPopup('📱 Tú estás aquí');
      }

      // Si hay un destino establecido y aún no hemos notificado
      if (destinoLatLng && !notificado) {
        // Calculamos la distancia en metros entre el usuario y el destino
        const distancia = userLatLng.distanceTo(destinoLatLng);

        // Si estamos dentro del radio de alerta, lanzamos la notificación
        if (distancia < DISTANCIA_ALERTA) {
          notificado = true; // Marcamos como notificado para no repetirlo
          mostrarNotificacion(distancia);
        }
      }
    },
    function (err) {
      // Si hay un error de geolocalización, lo mostramos en consola
      console.error('Error de geolocalización:', err.message);
    },
    {
      enableHighAccuracy: true, // Usamos GPS de alta precisión si está disponible
      maximumAge: 5000,         // Aceptamos una posición cacheada de máximo 5 segundos
      timeout: 10000            // Si en 10 segundos no hay posición, lanzamos error
    }
  );
} else {
  // Si el navegador no soporta geolocalización, avisamos al usuario
  alert('Tu navegador no soporta geolocalización');
}

// ─── MOSTRAR NOTIFICACIÓN ─────────────────────────────────────
function mostrarNotificacion(distancia) {
  // Construimos el mensaje con la distancia redondeada al metro
  const mensaje = `¡Estás a ${Math.round(distancia)} metros de tu destino!`;

  // Si el usuario nos dio permiso, lanzamos una notificación nativa del sistema
  if (Notification.permission === 'granted') {
    new Notification('🎯 ¡Cerca del destino!', { body: mensaje });
  }

  // Mostramos también un alert como respaldo visible en pantalla
  alert('🔔 ' + mensaje);
}