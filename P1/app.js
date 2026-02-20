// ─── CONFIGURACIÓN ───────────────────────────────────────────
const DISTANCIA_ALERTA = 200; // metros — avisa cuando estés a menos de 200m

// ─── VARIABLES GLOBALES ──────────────────────────────────────
let marcadorDestino = null;   // marcador que pone el usuario
let marcadorUsuario = null;   // marcador que muestra dónde estás tú
let destinoLatLng = null;     // coordenadas del destino elegido
let notificado = false;       // para no repetir la notificación

// ─── INICIALIZAR EL MAPA ─────────────────────────────────────
const map = L.map('map').setView([40.416775, -3.703790], 13); // Madrid por defecto

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// ─── PEDIR PERMISO PARA NOTIFICACIONES ───────────────────────
if ('Notification' in window) {
  Notification.requestPermission();
}

// ─── CLICK EN EL MAPA: establecer destino ────────────────────
map.on('click', function (e) {
  destinoLatLng = e.latlng;
  notificado = false;

  if (marcadorDestino) {
    map.removeLayer(marcadorDestino);
  }

  marcadorDestino = L.marker(destinoLatLng)
    .addTo(map)
    .bindPopup('🎯 Destino seleccionado')
    .openPopup();

  document.getElementById('info').innerHTML =
    `🎯 Destino: ${destinoLatLng.lat.toFixed(5)}, ${destinoLatLng.lng.toFixed(5)}
     <br><button id="btn-clear">Borrar destino</button>`;

  document.getElementById('btn-clear').addEventListener('click', borrarDestino);
});

// ─── BOTÓN BORRAR ─────────────────────────────────────────────
document.getElementById('btn-clear').addEventListener('click', borrarDestino);

function borrarDestino() {
  if (marcadorDestino) map.removeLayer(marcadorDestino);
  marcadorDestino = null;
  destinoLatLng = null;
  notificado = false;
  document.getElementById('info').innerHTML =
    '📍 Toca el mapa para establecer tu destino <br><button id="btn-clear">Borrar destino</button>';
  document.getElementById('btn-clear').addEventListener('click', borrarDestino);
}

// ─── SEGUIMIENTO DE UBICACIÓN EN TIEMPO REAL ─────────────────
if ('geolocation' in navigator) {
  navigator.geolocation.watchPosition(
    function (pos) {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const userLatLng = L.latLng(lat, lng);

      if (marcadorUsuario) {
        marcadorUsuario.setLatLng(userLatLng);
      } else {
        marcadorUsuario = L.circleMarker(userLatLng, {
          radius: 10,
          color: 'blue',
          fillColor: '#3388ff',
          fillOpacity: 0.8
        }).addTo(map).bindPopup('📱 Tú estás aquí');
      }

      if (destinoLatLng && !notificado) {
        const distancia = userLatLng.distanceTo(destinoLatLng);

        if (distancia < DISTANCIA_ALERTA) {
          notificado = true;
          mostrarNotificacion(distancia);
        }
      }
    },
    function (err) {
      console.error('Error de geolocalización:', err.message);
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
} else {
  alert('Tu navegador no soporta geolocalización');
}

// ─── MOSTRAR NOTIFICACIÓN ─────────────────────────────────────
function mostrarNotificacion(distancia) {
  const mensaje = `¡Estás a ${Math.round(distancia)} metros de tu destino!`;

  if (Notification.permission === 'granted') {
    new Notification('🎯 ¡Cerca del destino!', { body: mensaje });
  }

  alert('🔔 ' + mensaje);
}