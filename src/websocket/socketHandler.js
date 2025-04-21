// WebSocket handler for real-time gold price updates
const socketIo = require('socket.io');
const kafkaService = require('../services/kafkaService');
const goldPriceService = require('../services/goldPriceService');

class SocketHandler {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      this.io.on('connection', async (socket) => {
        console.log('Client connected:', socket.id);
        
        // Handle subscription to gold price updates
        socket.on('subscribe', async (goldType) => {
          console.log(`Client ${socket.id} subscribed to ${goldType}`);
          
          // Join room for this gold type
          socket.join(goldType);
          
          // Send the latest price immediately
          try {
            const latestPrice = await goldPriceService.getLatestGoldPrice(goldType);
            if (latestPrice) {
              const data = {
                [goldType]: latestPrice
              };
              socket.emit('goldPriceUpdate', data);
            }
          } catch (error) {
            console.error(`Error sending initial gold price for ${goldType}:`, error);
          }
        });
        
        // Handle unsubscribe
        socket.on('unsubscribe', (goldType) => {
          console.log(`Client ${socket.id} unsubscribed from ${goldType}`);
          socket.leave(goldType);
        });
        
        // Handle disconnect
        socket.on('disconnect', () => {
          console.log('Client disconnected:', socket.id);
        });
      });
      
      // Subscribe to Kafka for gold price updates
      await kafkaService.subscribeToGoldPriceUpdates('socket-io-group', (goldPriceData) => {
        const goldType = goldPriceData.type;
        const data = {
          [goldType]: {
            buy: goldPriceData.buy,
            sell: goldPriceData.sell,
            unit: goldPriceData.unit,
            updated_at: goldPriceData.timestamp
          }
        };
        
        // Broadcast to all clients subscribed to this gold type
        this.io.to(goldType).emit('goldPriceUpdate', data);
      });
      
      this.initialized = true;
      console.log('WebSocket handler initialized');
    } catch (error) {
      console.error('Failed to initialize WebSocket handler:', error);
      throw error;
    }
  }
}

module.exports = SocketHandler;