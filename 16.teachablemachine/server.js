const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Sirve los archivos de la carpeta public/
app.use(express.static('public'));
app.get('/mobile', (req, res) => res.sendFile(__dirname + '/public/mobile.html'));

let lastPrediction = null;

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    // Si ya hay predicción, se la mandamos al recién conectado
    if (lastPrediction) {
        socket.emit('prediction', lastPrediction);
    }

    // El ordenador manda la predicción → la retransmitimos a los móviles
    socket.on('prediction', (data) => {
        console.log('Predicción:', data);
        lastPrediction = data;
        socket.broadcast.emit('prediction', data);
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Servidor en http://localhost:3000');
    console.log('Móvil: http://<TU_IP_LOCAL>:3000/mobile');
});