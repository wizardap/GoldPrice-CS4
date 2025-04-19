const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');

// Import config và utils
const config = require('./config');
const logger = require('./utils/logger');
const { connectDB } = require('./utils/db');
const { connectRedis } = require('./utils/cache');
const { connectKafka, consumeMessages } = require('./services/kafka');
const { initializeSocketIO, emitPriceUpdate } = require('./services/socket');

// Import routes
const goldPriceRoutes = require('./routes/goldPriceRoutes');

// Khởi tạo Express app
const app = express();
const server = http.createServer(app);

// Khởi tạo Socket.IO
const io = initializeSocketIO(server);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes - Bỏ tiền tố '/api'
app.use('/', goldPriceRoutes);

// Viewer route - Hiển thị giá vàng
app.get('/viewer/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'viewer.html'));
});

// Trang chủ
app.get('/', (req, res) => {
  res.redirect('/vendors'); // Redirect về API hiển thị danh sách vendors đã bỏ '/api'
});

// Xử lý lỗi 404
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Không tìm thấy API endpoint này'
  });
});

// Xử lý các lỗi khác
app.use((err, req, res, next) => {
  logger.error(`Lỗi server: ${err.stack}`);
  res.status(500).json({
    success: false,
    message: 'Lỗi server: ' + (config.app.env === 'development' ? err.message : 'Đã có lỗi xảy ra')
  });
});

// Kết nối các dịch vụ và khởi động server
async function startServer() {
  try {
    // Kết nối MongoDB
    await connectDB();

    // Kết nối Redis (nếu có lỗi vẫn chạy tiếp)
    await connectRedis().catch(err => {
      logger.warn(`Khởi động không có Redis: ${err.message}`);
    });

    // Kết nối Kafka và đăng ký consumer
    await connectKafka().catch(err => {
      logger.warn(`Khởi động không có Kafka: ${err.message}`);
    });

    // Đăng ký handler xử lý message nhận được từ Kafka
    await consumeMessages(async (message) => {
      try {
        // Nếu là message cập nhật giá, emit tới các client đang theo dõi
        if (message.type === 'PRICE_UPDATED' && message.key) {
          emitPriceUpdate(message.key, message);
        }
      } catch (error) {
        logger.error(`Lỗi xử lý Kafka message: ${error.message}`);
      }
    }).catch(err => {
      logger.warn(`Không thể đăng ký Kafka consumer: ${err.message}`);
    });

    // Khởi động server
    const port = config.app.port;
    server.listen(port, () => {
      logger.info(`Server đang chạy ở cổng ${port} trong môi trường ${config.app.env}`);
    });

  } catch (error) {
    logger.error(`Không thể khởi động server: ${error.message}`);
    process.exit(1);
  }
}

// Xử lý tắt server an toàn
process.on('SIGINT', async () => {
  logger.info('Nhận tín hiệu SIGINT, đang tắt server...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Nhận tín hiệu SIGTERM, đang tắt server...');
  await cleanup();
  process.exit(0);
});

// Hàm dọn dẹp khi tắt server
async function cleanup() {
  try {
    // Đóng các kết nối
    if (server) {
      await new Promise(resolve => {
        server.close(resolve);
      });
      logger.info('HTTP server đã đóng');
    }
  } catch (error) {
    logger.error(`Lỗi khi tắt server: ${error.message}`);
  }
}

// Khởi động server
startServer();