const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const { initKafka } = require('./config/kafka');
const apiRoutes = require('./routes/api');
const goldPriceService = require('./services/goldPriceService');
const socketService = require('./services/socketService');
const cacheService = require('./services/cacheService');
const metricsService = require('./services/metricsService');
const ErrorHandler = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/logger');
const compression = require('compression'); // You'll need to install this

// Import security middleware
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

class Application {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);

        // Socket.IO with performance settings
        this.io = socketIo(this.server, {
            pingTimeout: 30000,
            pingInterval: 10000,
            transports: ['websocket'], // Prefer websockets
            allowUpgrades: false, // Disable transport upgrades for better performance
        });

        this.configureMiddleware();
        this.configureRoutes();
        this.configureErrorHandling();
    }

    configureMiddleware() {
        // Add compression middleware
        this.app.use(compression());

        // Security middleware
        this.app.use(
            helmet({
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ["'self'"],
                        connectSrc: ["'self'", "ws:", "wss:"],
                        scriptSrc: ["'self'", "'unsafe-inline'"],
                        styleSrc: ["'self'", "'unsafe-inline'"],
                        imgSrc: ["'self'", "data:"],
                        fontSrc: ["'self'", "data:"],
                    },
                },
            })
        );
        this.app.use(cors({
            origin: ['http://localhost:3000'],
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type']
        }));
        this.app.use('/api', rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 100,
            message: 'Quá nhiều request từ IP này, vui lòng thử lại sau 15 phút'
        }));

        // Add performance monitoring
        this.app.use((req, res, next) => {
            const start = Date.now();
            metricsService.incrementRequestCount();

            res.on('finish', () => {
                const duration = Date.now() - start;
                metricsService.recordResponseTime(duration);
                if (res.statusCode >= 400) {
                    metricsService.incrementErrorCount();
                }
            });

            next();
        });

        // Logger
        this.app.use(requestLogger);

        // Body parsing middleware
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Static files
        this.app.use(express.static('public', {
            maxAge: '1d' // Add cache control for static assets
        }));
    }

    configureRoutes() {
        // Thay vì this.app.use('/api', apiRoutes);
        this.app.use('/', apiRoutes);
    }

    configureErrorHandling() {
        this.app.use('*', ErrorHandler.notFound);
        this.app.use(ErrorHandler.handleError);
    }

    async start() {
        try {
            // Configure graceful shutdown
            this.configureGracefulShutdown();

            // Connect to MongoDB first
            await connectDB();
            console.log('MongoDB Connected successfully');

            // Initialize Kafka with explicit error handling and retries
            let kafkaInitialized = false;
            let retryCount = 0;
            const maxRetries = 5;

            while (!kafkaInitialized && retryCount < maxRetries) {
                try {
                    console.log(`Initializing Kafka (attempt ${retryCount + 1}/${maxRetries})...`);
                    const kafkaInfo = await initKafka();
                    console.log('Kafka available topics:', kafkaInfo.availableTopics);
                    kafkaInitialized = true;
                } catch (kafkaError) {
                    retryCount++;
                    console.error(`Kafka initialization error (attempt ${retryCount}/${maxRetries}):`, kafkaError.message);
                    if (retryCount < maxRetries) {
                        console.log(`Retrying in 5 seconds...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    } else {
                        console.log('Max retries reached. Continuing without Kafka...');
                    }
                }
            }

            // Initialize cache service with error handling
            try {
                await cacheService.connect();
                await cacheService.startCleanupInterval();
                console.log('Redis cache service initialized successfully');
            } catch (redisError) {
                console.error('Redis initialization error:', redisError);
                console.log('Continuing application startup without Redis caching...');
            }

            // Initialize socket service
            socketService.initSocket(this.io);

            // Initialize event-driven architecture
            const messageBrokerService = require('./services/messageBrokerService');
            const GoldPriceEventHandlers = require('./handlers/goldPriceEventHandlers');

            // Setup event handlers
            console.log('Initializing event handlers...');
            const eventHandlers = new GoldPriceEventHandlers(messageBrokerService);

            // Register socket callback for backward compatibility
            // This is the line that fixes the infinite recursion
            messageBrokerService.registerSocketCallback(data => socketService.bufferMessage(data));

            // Subscribe to messages (starts consuming from Kafka)
            await messageBrokerService.subscribeToMessages();
            console.log('Event-driven architecture initialized');

            // More efficient dynamic update interval
            const dynamicUpdateInterval = () => {
                const connectionCount = this.io.engine.clientsCount;
                metricsService.setSocketConnections(connectionCount);

                // More graduated approach with smooth scaling
                if (connectionCount <= 10) {
                    return 3000; // 3 seconds for minimal load
                } else if (connectionCount <= 30) {
                    return 5000; // 5 seconds for low load
                } else if (connectionCount <= 70) {
                    return 7500; // 7.5 seconds for medium load
                } else if (connectionCount <= 150) {
                    return 10000; // 10 seconds for high load
                } else {
                    return 15000; // 15 seconds for very high load
                }
            };

            // Update prices with dynamic frequency
            const scheduleNextUpdate = () => {
                const interval = dynamicUpdateInterval();
                setTimeout(async () => {
                    await goldPriceService.updateGoldPrice();
                    scheduleNextUpdate();
                }, interval);
            };

            scheduleNextUpdate();

            this.server.listen(3000, () => {
                console.log('Server running on port 3000');
            });
        } catch (error) {
            console.error('Failed to start application:', error);
            process.exit(1);
        }
    }

    // ADD: Graceful shutdown handler
    configureGracefulShutdown() {
        process.on('SIGTERM', this.shutdown.bind(this));
        process.on('SIGINT', this.shutdown.bind(this));
    }

    // ADD: Shutdown method
    async shutdown() {
        console.log('Shutting down gracefully...');

        // Close the HTTP server first to stop accepting new connections
        this.server.close(() => console.log('HTTP server closed'));

        // Close socket connections
        if (this.io) {
            this.io.close(() => console.log('Socket.IO connections closed'));
        }

        // Close all other services in reverse order of initialization
        try {
            await Promise.all([
                socketService.shutdownService(),
                messageBrokerService.shutdown(),
                cacheService.shutdown(),
            ]);

            // Close database connection last
            await mongoose.connection.close();
            console.log('Database connections closed');

            console.log('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}

const app = new Application();
app.start();