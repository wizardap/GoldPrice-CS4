const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const { initKafka } = require('./config/kafka');
const apiRoutes = require('./routes/api');
const goldPriceService = require('./services/goldPriceService');
const socketService = require('./services/socketService');

class Application {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server);
        this.configureMiddleware();
        this.configureRoutes();
    }

    configureMiddleware() {
        this.app.use(express.json());
        this.app.use(express.static('public'));
    }

    configureRoutes() {
        this.app.use('/api', apiRoutes);
    }

    async start() {
        try {
            // Initialize services
            await connectDB();
            await initKafka();

            // Initialize socket service
            socketService.initSocket(this.io);

            // Schedule gold price updates
            setInterval(() => goldPriceService.updateGoldPrice(), 5000);

            // Start server
            this.server.listen(3000, () => {
                console.log('Server running on port 3000');
            });
        } catch (error) {
            console.error('Failed to start application:', error);
            process.exit(1);
        }
    }
}

const app = new Application();
app.start();