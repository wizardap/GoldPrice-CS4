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

/**
 * Khởi tạo Express app và HTTP server
 * @description
 * Tạo các instance chính cho ứng dụng: Express app và HTTP server
 * HTTP server được tạo riêng để có thể gắn Socket.IO
 */
const app = express();
const server = http.createServer(app);

/**
 * Khởi tạo Socket.IO cho real-time communication
 * @description Kết nối Socket.IO với HTTP server để hỗ trợ cập nhật giá vàng real-time
 */
const io = initializeSocketIO(server);

/**
 * Cấu hình các middleware cho Express
 * @description
 * - helmet: Bảo mật HTTP headers
 * - cors: Cho phép cross-origin requests
 * - bodyParser: Parse request body dạng JSON
 * - express.static: Phục vụ static files từ thư mục public
 */
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Cấu hình routes
 * @description Định nghĩa các API endpoints và static routes
 */
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

/**
 * Error handling middleware
 * @description
 * Xử lý các lỗi và trả về response phù hợp
 */
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

/**
 * Khởi động server và kết nối các dịch vụ
 * @description
 * Hàm chính để khởi động server và thiết lập kết nối đến các services:
 * - MongoDB: Database chính, bắt buộc để server hoạt động
 * - Redis: Cache service, server vẫn chạy nếu không kết nối được
 * - Kafka: Message broker, server vẫn chạy nếu không kết nối được
 * @returns {Promise<void>}
 */
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

    /**
     * Đăng ký Kafka message handler
     * @description
     * Handler để xử lý messages từ Kafka và gửi cập nhật qua Socket.IO
     * đến các clients đang theo dõi
     */
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

/**
 * Graceful shutdown handlers
 * @description 
 * Xử lý các signals để tắt server một cách an toàn,
 * đảm bảo đóng tất cả các kết nối trước khi thoát
 */
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

/**
 * Hàm dọn dẹp khi tắt server
 * @description
 * Đóng tất cả các kết nối một cách an toàn trước khi thoát:
 * - HTTP server
 * - Database connections (được xử lý trong process.exit)
 * @returns {Promise<void>}
 */
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