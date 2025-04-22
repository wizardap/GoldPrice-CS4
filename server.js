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

// Thêm xử lý lỗi không bắt được
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Ghi log lỗi
  // Chờ 3 giây để log được ghi xong
  setTimeout(() => {
    process.exit(1); // Docker/Kubernetes sẽ tự động khởi động lại container
  }, 3000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Không exit process, chỉ log lỗi
});

// Start the application
initApp();