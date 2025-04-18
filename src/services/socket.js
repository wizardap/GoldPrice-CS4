const socketIo = require('socket.io');
const logger = require('../utils/logger');

let io;

// Khởi tạo Socket.IO server
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
    
    // Đăng ký client vào room theo keyID
    socket.on('join', (keyID) => {
      if (!keyID) return;
      
      socket.join(keyID);
      logger.info(`Client ${socket.id} joined room: ${keyID}`);
      
      // Gửi thông báo xác nhận đã tham gia phòng
      socket.emit('joined', { room: keyID, success: true });
    });
    
    // Xử lý client ngắt kết nối
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
    
    // Xử lý lỗi socket
    socket.on('error', (error) => {
      logger.error(`Socket error: ${error.message}`, { socketId: socket.id });
    });
  });

  logger.info('Socket.IO initialized');
  return io;
};

// Gửi cập nhật giá đến các client đang theo dõi keyID
const emitPriceUpdate = (keyID, data) => {
  if (!io) {
    logger.error('Socket.IO not initialized');
    return false;
  }
  
  // Gửi đến tất cả client trong room keyID
  io.to(keyID).emit('priceUpdate', {
    key: keyID,
    value: data.value || data.products,
    timestamp: data.timestamp || new Date()
  });
  
  logger.info(`Price update emitted to room: ${keyID}`);
  return true;
};

// Gửi thông báo lỗi đến client cụ thể
const emitError = (socketId, error) => {
  if (!io) {
    logger.error('Socket.IO not initialized');
    return false;
  }
  
  io.to(socketId).emit('error', { message: error.message || error });
  logger.info(`Error emitted to socket: ${socketId}`);
  return true;
};

// Lấy số lượng client đang kết nối trong một room
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