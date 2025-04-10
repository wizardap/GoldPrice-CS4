const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const { initKafka } = require('./config/kafka');
const apiRoutes = require('./routes/api');
const { updateGoldPrice } = require('./services/goldPriceService');
const { initSocket } = require('./services/socketService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/api', apiRoutes);

// Khởi động dịch vụ
const startServer = async () => {
    await connectDB();
    await initKafka();
    initSocket(io);

    // Cập nhật giá vàng định kỳ mỗi 5 giây
    setInterval(updateGoldPrice, 5000);

    server.listen(3000, () => {
        console.log('Server running on port 3000');
    });
};

startServer();