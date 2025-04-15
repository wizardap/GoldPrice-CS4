const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const connectDB = require('./db/connection');
const lib = require('./utils');
const pricePublisher = require('./services/pricePublisher');
const socketService = require('./services/socketService');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const port = 8080;

// Initialize services
async function initializeServices() {
    // Connect to MongoDB
    await connectDB();

    // Initialize price publisher
    await pricePublisher.init();

    // Initialize socket service
    socketService.init(server);

    console.log('All services initialized');
}

// Middleware
app.use(bodyParser.json());

// Routes
app.post('/add', async (req, res) => {
    try {
        const { key, value } = req.body;

        // 1. Save data to database
        await lib.write(key, value);

        // 2. Publish price update through the publisher service
        await pricePublisher.publishPriceUpdate(key, value);

        res.send("Insert a new record successfully!");
    } catch (err) {
        res.status(500).send(err.toString());
    }
});

app.get('/get/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const value = await lib.view(id);
        res.json(value || []);
    } catch (err) {
        res.status(500).json({ error: err.toString() });
    }
});

app.get('/viewer/:id', (req, res) => {
    res.sendFile(path.join(__dirname, "viewer.html"));
});

// Initialize and start server
initializeServices()
    .then(() => {
        server.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    })
    .catch(err => {
        console.error('Failed to initialize services:', err);
        process.exit(1);
    });