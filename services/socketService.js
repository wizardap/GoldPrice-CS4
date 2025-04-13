const messageBrokerService = require('./messageBrokerService');

class SocketService {
    initSocket(io) {
        io.on('connection', (socket) => {
            console.log('New client connected');

            socket.on('subscribe', (keyID) => {
                socket.join(keyID);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected');
            });
        });

        // Subscribe to messages from the broker
        messageBrokerService.subscribeToMessages((goldPrice) => {
            io.to(goldPrice.keyID).emit('priceUpdate', goldPrice);
        });
    }
}

module.exports = new SocketService();