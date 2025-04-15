const socketIO = require('socket.io');
const priceSubscriber = require('./priceSubscriber');

class SocketService {
    constructor() {
        this.io = null;
        this.initialized = false;
        this.unsubscribeFunctions = new Map();
    }

    init(server) {
        this.io = socketIO(server);

        this.io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            // Client subscribes to a specific seller
            socket.on('subscribe', async (sellerId) => {
                console.log(`Client ${socket.id} subscribed to ${sellerId}`);
                socket.join(sellerId);

                // Subscribe to Redis and relay messages to socket clients
                const unsubscribe = await priceSubscriber.subscribeToSeller(sellerId, (data) => {
                    this.io.to(sellerId).emit('priceUpdate', data);
                });

                // Store unsubscribe function for cleanup
                this.unsubscribeFunctions.set(`${socket.id}:${sellerId}`, unsubscribe);
            });

            // Handle client disconnecting
            socket.on('disconnect', async () => {
                console.log('Client disconnected:', socket.id);

                // Clean up all subscriptions for this socket
                for (const [key, unsubscribe] of this.unsubscribeFunctions.entries()) {
                    if (key.startsWith(`${socket.id}:`)) {
                        await unsubscribe();
                        this.unsubscribeFunctions.delete(key);
                    }
                }
            });
        });

        this.initialized = true;
    }

    // Method to broadcast to specific room (seller ID)
    emit(room, event, data) {
        if (!this.initialized) {
            throw new Error('Socket service not initialized');
        }
        this.io.to(room).emit(event, data);
    }

    // Method to broadcast to all connected clients
    broadcast(event, data) {
        if (!this.initialized) {
            throw new Error('Socket service not initialized');
        }
        this.io.emit(event, data);
    }
}

module.exports = new SocketService();