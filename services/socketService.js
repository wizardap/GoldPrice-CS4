const { consumer } = require('../config/kafka');

const initSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('New client connected');
        socket.on('subscribe', (keyID) => {
            socket.join(keyID);
        });
        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
    });

    consumer.run({
        eachMessage: async ({ message }) => {
            const goldPrice = JSON.parse(message.value);
            io.to(goldPrice.keyID).emit('priceUpdate', goldPrice);
        }
    });
};

module.exports = { initSocket };