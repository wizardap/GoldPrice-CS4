/**
 * Benchmark script cho ứng dụng GoldPrice
 * Đo lường hiệu năng của các API và kiến trúc publisher-subscriber
 */

const axios = require('axios');
const io = require('socket.io-client');
const { performance, PerformanceObserver } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

// Cấu hình benchmark
const config = {
  baseUrl: 'http://localhost:8080',
  sampleSize: 100,
  concurrentUsers: 50,
  dataPoints: 10
};

// Lưu kết quả benchmark
const results = {
  timestamp: new Date().toISOString(),
  apiPerformance: {},
  socketPerformance: {},
  summary: {}
};

// Tạo thư mục logs nếu chưa tồn tại
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Ghi log kết quả
const writeResults = () => {
  const filename = path.join(logDir, `benchmark-${new Date().toISOString().replace(/:/g, '-')}.json`);
  fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  console.log(`\nKết quả benchmark đã được lưu vào: ${filename}`);
};

// Kiểm tra API endpoint
const benchmarkEndpoint = async (endpoint, method = 'GET', data = null) => {
  console.log(`\nBenchmarking ${method} ${endpoint}...`);
  
  const durations = [];
  const errors = [];
  
  for (let i = 0; i < config.sampleSize; i++) {
    try {
      const start = performance.now();
      
      if (method === 'GET') {
        await axios.get(`${config.baseUrl}${endpoint}`);
      } else if (method === 'POST') {
        await axios.post(`${config.baseUrl}${endpoint}`, data);
      }
      
      const end = performance.now();
      durations.push(end - start);
      
      // In tiến trình
      if ((i + 1) % 10 === 0) {
        process.stdout.write(`Đã hoàn thành ${i + 1}/${config.sampleSize} requests\r`);
      }
    } catch (error) {
      errors.push(error.message);
    }
  }
  
  // Tính toán các chỉ số
  const avg = durations.reduce((sum, val) => sum + val, 0) / durations.length;
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  
  // Tính percentiles
  const sorted = [...durations].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  
  const stats = {
    samples: durations.length,
    errors: errors.length,
    min: min.toFixed(2),
    max: max.toFixed(2),
    avg: avg.toFixed(2),
    p50: p50.toFixed(2),
    p95: p95.toFixed(2),
    p99: p99.toFixed(2)
  };
  
  console.log(`\nKết quả cho ${method} ${endpoint}:`);
  console.log(`  Samples: ${stats.samples}`);
  console.log(`  Errors: ${stats.errors}`);
  console.log(`  Min: ${stats.min} ms`);
  console.log(`  Max: ${stats.max} ms`);
  console.log(`  Avg: ${stats.avg} ms`);
  console.log(`  P50: ${stats.p50} ms`);
  console.log(`  P95: ${stats.p95} ms`);
  console.log(`  P99: ${stats.p99} ms`);
  
  results.apiPerformance[`${method} ${endpoint}`] = stats;
  
  return stats;
};

// Kiểm tra hiệu năng Socket.IO
const benchmarkSocketIO = async (vendorId) => {
  console.log(`\nBenchmarking Socket.IO kết nối cho vendor ${vendorId}...`);
  
  const connectionTimes = [];
  const messageTimes = [];
  const errors = [];
  
  // Tạo nhiều kết nối đồng thời
  const promises = Array(config.concurrentUsers).fill().map(async (_, index) => {
    try {
      const connectionStart = performance.now();
      
      // Kết nối socket
      const socket = io(`${config.baseUrl}`, {
        transports: ['websocket'],
        forceNew: true
      });
      
      // Đợi kết nối thành công
      await new Promise((resolve, reject) => {
        socket.on('connect', () => {
          const connectionEnd = performance.now();
          connectionTimes.push(connectionEnd - connectionStart);
          
          // Đăng ký theo dõi vendor
          socket.emit('join', vendorId);
          
          // Lắng nghe cập nhật giá
          let messageReceived = false;
          
          socket.on('priceUpdate', (data) => {
            if (!messageReceived && data.key === vendorId) {
              messageReceived = true;
              messageTimes.push(performance.now() - connectionEnd);
            }
          });
          
          resolve(socket);
        });
        
        socket.on('connect_error', (error) => {
          errors.push(`Connection error: ${error.message}`);
          reject(error);
        });
        
        // Timeout sau 10 giây
        setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);
      });
      
      // In tiến trình
      if ((index + 1) % 10 === 0) {
        process.stdout.write(`Đã tạo ${index + 1}/${config.concurrentUsers} kết nối\r`);
      }
      
      // Đợi một chút rồi ngắt kết nối
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return true;
    } catch (error) {
      errors.push(error.message);
      return false;
    }
  });
  
  // Đợi tất cả kết nối hoàn tất
  await Promise.all(promises);
  
  // Tính toán các chỉ số kết nối
  if (connectionTimes.length > 0) {
    const avgConn = connectionTimes.reduce((sum, val) => sum + val, 0) / connectionTimes.length;
    const minConn = Math.min(...connectionTimes);
    const maxConn = Math.max(...connectionTimes);
    
    const sortedConn = [...connectionTimes].sort((a, b) => a - b);
    const p50Conn = sortedConn[Math.floor(sortedConn.length * 0.5)];
    const p95Conn = sortedConn[Math.floor(sortedConn.length * 0.95)];
    
    results.socketPerformance.connection = {
      samples: connectionTimes.length,
      errors: errors.length,
      min: minConn.toFixed(2),
      max: maxConn.toFixed(2),
      avg: avgConn.toFixed(2),
      p50: p50Conn.toFixed(2),
      p95: p95Conn.toFixed(2)
    };
    
    console.log('\nKết quả Socket.IO kết nối:');
    console.log(`  Kết nối thành công: ${connectionTimes.length}/${config.concurrentUsers}`);
    console.log(`  Lỗi: ${errors.length}`);
    console.log(`  Thời gian kết nối trung bình: ${avgConn.toFixed(2)} ms`);
    console.log(`  Thời gian kết nối nhanh nhất: ${minConn.toFixed(2)} ms`);
    console.log(`  Thời gian kết nối chậm nhất: ${maxConn.toFixed(2)} ms`);
  }
  
  // Tính toán chỉ số nhận tin nhắn
  if (messageTimes.length > 0) {
    const avgMsg = messageTimes.reduce((sum, val) => sum + val, 0) / messageTimes.length;
    const minMsg = Math.min(...messageTimes);
    const maxMsg = Math.max(...messageTimes);
    
    const sortedMsg = [...messageTimes].sort((a, b) => a - b);
    const p50Msg = sortedMsg[Math.floor(sortedMsg.length * 0.5)];
    const p95Msg = sortedMsg[Math.floor(sortedMsg.length * 0.95)];
    
    results.socketPerformance.messageReceiving = {
      samples: messageTimes.length,
      min: minMsg.toFixed(2),
      max: maxMsg.toFixed(2),
      avg: avgMsg.toFixed(2),
      p50: p50Msg.toFixed(2),
      p95: p95Msg.toFixed(2)
    };
    
    console.log('\nKết quả nhận tin nhắn Socket.IO:');
    console.log(`  Tin nhắn nhận được: ${messageTimes.length}`);
    console.log(`  Thời gian nhận trung bình: ${avgMsg.toFixed(2)} ms`);
    console.log(`  Thời gian nhận nhanh nhất: ${minMsg.toFixed(2)} ms`);
    console.log(`  Thời gian nhận chậm nhất: ${maxMsg.toFixed(2)} ms`);
  }
};

// Hàm tạo dữ liệu giả
const generateMockData = (vendorId) => {
  return {
    key: vendorId,
    value: [
      {
        type: 'SJC',
        buyPrice: 7300000 + Math.floor(Math.random() * 50000),
        sellPrice: 7350000 + Math.floor(Math.random() * 50000)
      },
      {
        type: '999.9',
        buyPrice: 7200000 + Math.floor(Math.random() * 50000),
        sellPrice: 7250000 + Math.floor(Math.random() * 50000)
      }
    ]
  };
};

// Chạy benchmark
async function runBenchmark() {
  console.log('=== Bắt đầu benchmark GoldPrice App ===');
  console.log(`Thời gian: ${new Date().toLocaleString()}`);
  console.log(`Cấu hình: ${config.sampleSize} samples, ${config.concurrentUsers} concurrent users\n`);
  
  try {
    // Test các API endpoint
    await benchmarkEndpoint('/vendors', 'GET');
    await benchmarkEndpoint('/get/vendor1', 'GET');
    
    // Khởi tạo dữ liệu để test
    console.log('\nTạo dữ liệu benchmark...');
    await axios.post(`${config.baseUrl}/add`, generateMockData('benchmark-vendor'));
    
    // Test thêm giá vàng
    for (let i = 0; i < config.dataPoints; i++) {
      await benchmarkEndpoint('/add', 'POST', generateMockData('benchmark-vendor'));
    }
    
    // Test lấy lịch sử giá
    await benchmarkEndpoint('/history/benchmark-vendor', 'GET');
    
    // Test Socket.IO
    await benchmarkSocketIO('benchmark-vendor');
    
    // Lưu kết quả benchmark
    writeResults();
    
    console.log('\n=== Benchmark hoàn tất ===');
  } catch (error) {
    console.error(`\nLỗi khi chạy benchmark: ${error.message}`);
  }
}

// Chạy benchmark
runBenchmark();