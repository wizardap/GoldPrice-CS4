const socketIo = require('socket.io');
const logger = require('../utils/logger');

let io;

/**
 * Khởi tạo Socket.IO server với cấu hình tối ưu
 * @param {Object} server - HTTP server instance để gắn Socket.IO
 * @returns {Object} - Socket.IO server instance đã khởi tạo
 * @description Khởi tạo Socket.IO server với các cấu hình CORS, transport, timeout
 * và kích thước buffer. Thiết lập các event handler cho connection, join, disconnect và error.
 */
const initializeSocketIO = (server) => {
  io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    maxHttpBufferSize: 1e6
  });

  // Xử lý kết nối socket
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    /**
     * Event handler cho sự kiện 'join'
     * Cho phép client tham gia vào room để nhận cập nhật giá từ một vendor cụ thể
     */
    socket.on('join', (keyID) => {
      if (!keyID) return;

      // Convert keyID to lowercase for consistency
      const normalizedKeyID = keyID.toLowerCase();

      socket.join(normalizedKeyID);
      logger.info(`Client ${socket.id} joined room: ${normalizedKeyID}`);

      // Gửi thông báo xác nhận đã tham gia phòng
      socket.emit('joined', { room: normalizedKeyID, success: true });
    });

    /**
     * Event handler cho sự kiện 'disconnect'
     * Ghi log khi client ngắt kết nối
     */
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });

    /**
     * Event handler cho sự kiện 'error'
     * Ghi log khi xảy ra lỗi socket
     */
    socket.on('error', (error) => {
      logger.error(`Socket error: ${error.message}`, { socketId: socket.id });
    });
  });

  logger.info('Socket.IO initialized');
  return io;
};

/**
 * Gửi cập nhật giá đến các client đang theo dõi vendor (keyID)
 * @param {string} keyID - ID của vendor cần gửi cập nhật
 * @param {Object} data - Dữ liệu giá vàng được cập nhật
 * @returns {boolean} - Kết quả của việc gửi cập nhật (true: thành công, false: thất bại)
 * @description Gửi dữ liệu cập nhật giá vàng tới tất cả client trong room tương ứng với keyID
 */
const emitPriceUpdate = (keyID, data) => {
  if (!io) {
    logger.error('Socket.IO not initialized');
    return false;
  }

  // Convert keyID to lowercase for consistency
  const normalizedKeyID = keyID.toLowerCase();

  // Gửi đến tất cả client trong room keyID
  io.to(normalizedKeyID).emit('priceUpdate', {
    key: normalizedKeyID,
    value: data.value || data.products,
    timestamp: data.timestamp || new Date()
  });

  logger.info(`Price update emitted to room: ${normalizedKeyID}`);
  return true;
};

/**
 * Gửi thông báo lỗi đến một client cụ thể
 * @param {string} socketId - ID của socket client cần gửi thông báo lỗi
 * @param {Error|string} error - Lỗi hoặc thông báo lỗi cần gửi
 * @returns {boolean} - Kết quả của việc gửi thông báo (true: thành công, false: thất bại)
 * @description Gửi thông báo lỗi đến một client cụ thể dựa trên socketId
 */
const emitError = (socketId, error) => {
  if (!io) {
    logger.error('Socket.IO not initialized');
    return false;
  }

  io.to(socketId).emit('error', { message: error.message || error });
  logger.info(`Error emitted to socket: ${socketId}`);
  return true;
};

/**
 * Lấy số lượng client đang kết nối trong một room
 * @param {string} room - Tên của room cần kiểm tra
 * @returns {number} - Số lượng client đang kết nối trong room
 * @description Đếm và trả về số lượng client đang kết nối trong một room cụ thể
 */
const getClientsCount = async (room) => {
  if (!io) {
    logger.error('Socket.IO not initialized');
    return 0;
  }

  const sockets = await io.in(room).fetchSockets();
  return sockets.length;
};

module.exports = {
  initializeSocketIO,
  emitPriceUpdate,
  emitError,
  getClientsCount
};