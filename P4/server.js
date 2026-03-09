const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const TASKS_FILE = path.join(__dirname, 'tasks.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readTasks() {
    const data = fs.readFileSync(TASKS_FILE, 'utf8');
    return JSON.parse(data);
}

function saveTasks(tasks) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

app.get('/tasks', (req, res) => {
    const tasks = readTasks();
    res.json(tasks);
});

app.post('/tasks', (req, res) => {
    const { title } = req.body;
    if (!title) {
        return res.status(400).json({ error: 'El campo title es obligatorio' });
    }
    const tasks = readTasks();
    const newTask = {
        id: Date.now(),
        title,
        completed: false
    };
    tasks.push(newTask);
    saveTasks(tasks);
    res.status(201).json(newTask);
});

app.put('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const tasks = readTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
        return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    tasks[index] = { ...tasks[index], ...req.body };
    saveTasks(tasks);
    res.json(tasks[index]);
});

app.delete('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const tasks = readTasks();
    const newTasks = tasks.filter(t => t.id !== id);
    if (newTasks.length === tasks.length) {
        return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    saveTasks(newTasks);
    res.json({ message: 'Tarea eliminada correctamente' });
});

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});