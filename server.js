// Main server file for Gold Price Monitoring App
const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import services and components
const apiRoutes = require('./src/routes/api');
const goldPriceService = require('./src/services/goldPriceService');
const SocketHandler = require('./src/websocket/socketHandler');
const cacheService = require('./src/services/cacheService');
const kafkaService = require('./src/services/kafkaService');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 8080;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'src/public')));

// API Routes
app.use('/', apiRoutes);

// Viewer route
app.get('/viewer/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/public/index.html'));
});

// Initialize socket handler
const socketHandler = new SocketHandler(server);

// Initialize the application
async function initApp() {
    try {
        // Initialize gold price service (database, cache, kafka)
        await goldPriceService.init();

        // Initialize Socket.IO
        await socketHandler.init();

        // Start the server
        server.listen(port, () => {
            console.log(`Gold Price Monitoring server running on port ${port}`);
        });

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('Shutting down server...');
            await goldPriceService.close();
            process.exit(0);
        });
    } catch (error) {
        console.error('Failed to initialize application:', error);
        process.exit(1);
    }
}

// Thêm vào phần khởi động server
async function startServer() {
    try {
        // Kết nối Redis
        await cacheService.connect();

        // Khởi tạo Kafka với nhiều partitions
        await kafkaService.init();

        // Khởi tạo dịch vụ giá vàng
        await goldPriceService.init();

        // Khởi tạo socket handler
        await socketHandler.init();

        // Khởi động server
        server.listen(port, () => {
            console.log(`Gold Price Monitoring server running on port ${port}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the application
initApp();