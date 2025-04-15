const messageBrokerService = require('./messageBrokerService');

class SocketService {
    constructor() {
        this.clients = new Map(); // Track connected clients
        this.messageBuffer = new Map(); // Buffer messages by keyID
        this.bufferTimeout = 200; // Buffer time in ms
        this.bufferTimers = new Map(); // Track buffer timers
        this.MAX_BUFFER_SIZE = 100; // Maximum buffer size

        // Add periodic cleanup
        setInterval(() => this.cleanupOrphanedClients(), 60000); // Every minute
    }

    initSocket(io) {
        this.io = io; // Store reference for cleanupOrphanedClients
        // Configure Socket.IO for better performance
        io.engine.pingTimeout = 30000; // Faster client timeout detection
        io.engine.pingInterval = 10000; // Faster ping interval

        io.on('connection', (socket) => {
            console.log('New client connected');
            this.clients.set(socket.id, new Set()); // Track subscribed keys

            socket.on('subscribe', (keyID) => {
                socket.join(keyID);
                // Track which keys this client subscribes to
                const subscriptions = this.clients.get(socket.id);
                subscriptions.add(keyID);

                console.log(`Client ${socket.id} subscribed to ${keyID}`);
            });

            // Thêm option để subcribe tất cả
            socket.on('subscribeAll', () => {
                const brands = ['DOJI', 'PNJ', 'SJC'];
                brands.forEach(brand => {
                    socket.join(brand);
                    const subscriptions = this.clients.get(socket.id);
                    subscriptions.add(brand);
                });
                console.log(`Client ${socket.id} subscribed to all brands`);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected');
                this.clients.delete(socket.id);
            });
        });
    }

    // Modified bufferMessage method
    bufferMessage(event) {
        if (!event || !event.keyID) return;

        const keyID = event.keyID;

        // Check if buffer size limit reached
        if (this.messageBuffer.size >= this.MAX_BUFFER_SIZE && !this.messageBuffer.has(keyID)) {
            // Find and flush oldest entry
            const oldestEntry = Array.from(this.messageBuffer.entries())
                .reduce((oldest, entry) => {
                    const [currentKey, currentValue] = entry;
                    const [oldestKey, oldestValue] = oldest;

                    return new Date(currentValue.timestamp) < new Date(oldestValue.timestamp)
                        ? entry : oldest;
                });

            if (oldestEntry) {
                const [oldestKey] = oldestEntry;
                this.flushBuffer(oldestKey);
            }
        }

        if (!this.messageBuffer.has(keyID)) {
            this.messageBuffer.set(keyID, event);
        } else {
            // Always update with latest data
            this.messageBuffer.set(keyID, event);
        }

        // Clear existing timer if present
        if (this.bufferTimers.has(keyID)) {
            clearTimeout(this.bufferTimers.get(keyID));
        }

        // Set new timer to flush buffer
        const timer = setTimeout(() => {
            this.flushBuffer(keyID);
        }, this.bufferTimeout);

        this.bufferTimers.set(keyID, timer);
    }

    // Modified flushBuffer method
    flushBuffer(keyID) {
        if (this.messageBuffer.has(keyID) && this.io) {
            const event = this.messageBuffer.get(keyID);
            this.io.to(keyID).emit('priceUpdate', event);
            this.messageBuffer.delete(keyID);
            this.bufferTimers.delete(keyID);
        }
    }

    shutdownService() {
        // Xóa tất cả các timer đang chạy
        for (const timer of this.bufferTimers.values()) {
            clearTimeout(timer);
        }
        this.bufferTimers.clear();
        this.messageBuffer.clear();
    }

    // ADD: Cleanup method for orphaned clients
    cleanupOrphanedClients() {
        if (!this.io) return;

        const connectedSocketIds = new Set(
            Object.keys(this.io.sockets.sockets)
        );

        let orphanedCount = 0;
        for (const clientId of this.clients.keys()) {
            if (!connectedSocketIds.has(clientId)) {
                this.clients.delete(clientId);
                orphanedCount++;
            }
        }

        if (orphanedCount > 0) {
            console.log(`Cleaned up ${orphanedCount} orphaned client entries`);
        }
    }
}

module.exports = new SocketService();