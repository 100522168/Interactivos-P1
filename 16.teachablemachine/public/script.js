const URL = "https://teachablemachine.withgoogle.com/models/_4qfbSXm8/";
let model, webcam, labelContainer, maxPredictions;

// Conectar a Socket.IO
const socket = io();
const statusDiv = document.getElementById('status');

socket.on('connect', () => {
    statusDiv.textContent = '🟢 Conectado al servidor';
    statusDiv.className = 'connected';
});
socket.on('disconnect', () => {
    statusDiv.textContent = '🔴 Desconectado del servidor';
    statusDiv.className = 'disconnected';
});

async function init() {
    model = await tmImage.load(URL + "model.json", URL + "metadata.json");
    maxPredictions = model.getTotalClasses();

    const flip = true;
    webcam = new tmImage.Webcam(200, 200, flip);
    await webcam.setup();
    await webcam.play();
    window.requestAnimationFrame(loop);

    document.getElementById("webcam-container").appendChild(webcam.canvas);

    labelContainer = document.getElementById("label-container");
    for (let i = 0; i < maxPredictions; i++) {
        labelContainer.appendChild(document.createElement("div"));
    }
}

async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    const prediction = await model.predict(webcam.canvas);

    let best = prediction.reduce((a, b) => a.probability > b.probability ? a : b);

    for (let i = 0; i < maxPredictions; i++) {
        labelContainer.childNodes[i].innerHTML =
            prediction[i].className + ": " + prediction[i].probability.toFixed(2);
    }

    // Enviar la clase ganadora por Socket.IO
    socket.emit('prediction', {
        clase: best.className,
        probabilidad: best.probability.toFixed(2)
    });
}