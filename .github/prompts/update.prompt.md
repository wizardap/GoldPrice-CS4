Hãy giúp tôi nâng cấp dự án GoldPrice-CS4 - một ứng dụng theo dõi giá vàng theo thời gian thực. Dự án hiện tại là một chương trình đơn giản sử dụng Express.js để lưu trữ dữ liệu dạng key-value, nhưng cần được cải tiến về kiến trúc và hiệu năng.

## YÊU CẦU BẮT BUỘC:

1. **Thay thế cơ chế polling hiện tại**:

   - Hiện tại viewer.html đang sử dụng request liên tục để cập nhật giá
   - Thay thế bằng Socket.io hoặc công nghệ real-time tương tự
   - Mục tiêu: giảm tải server và độ trễ khi cập nhật giá vàng

2. **Triển khai ORM cho lớp persistence**:

   - Sử dụng Mongoose để tương tác với MongoDB
   - Thiết kế schema phù hợp cho dữ liệu giá vàng (bao gồm keyID, giá trị, timestamp)
   - Đảm bảo lưu trữ lịch sử giá để phân tích xu hướng

3. **Kiến trúc Publisher-Subscriber**:

   - Triển khai với RabbitMQ hoặc Kafka làm message broker
   - Publisher: phát thông báo khi có cập nhật giá mới
   - Subscriber: nhận và xử lý thông báo để cập nhật dữ liệu hiển thị

4. **Phân tích và đánh giá hiệu năng**:

   - Xác định các vấn đề về hiệu năng, khả năng mở rộng, bảo mật của thiết kế ban đầu
   - So sánh hiệu năng trước và sau khi nâng cấp (thông lượng, độ trễ, CPU/memory usage)
   - Đánh giá dựa trên các metrics cụ thể

5. **Thay thế hoàn toàn cơ sở dữ liệu**:

   - Chuyển từ lưu trữ tệp sang MongoDB
   - Thiết kế database schema tối ưu cho việc lưu trữ dữ liệu giá vàng
   - Tạo các indexes phù hợp để tối ưu query

6. **Cải thiện giao diện người dùng**:

   - Nâng cấp viewer.html thành dashboard theo dõi giá vàng chuyên nghiệp
   - Thêm biểu đồ theo dõi giá theo thời gian (Chart.js hoặc D3.js)
   - Tạo giao diện responsive, dễ sử dụng với Bootstrap/Tailwind

7. **Tối ưu hóa hiệu năng**:
   - Cải thiện tốc độ xử lý request
   - Bổ sung caching để giảm tải database
   - Tối ưu code để giảm memory footprint

Tạo mã nguồn hoàn chỉnh có đầy đủ chức năng theo yêu cầu trên, kèm tài liệu hướng dẫn triển khai chi tiết và báo cáo so sánh hiệu năng trước/sau khi nâng cấp# Gold Price Tracker Enhancement Project - AI Agent Implementation Guide

You are tasked with enhancing a real-time gold price tracking application. The project is partially implemented with Express.js, MongoDB with Mongoose, and Socket.io integration. Your task is to complete the remaining requirements and optimize the system.

## Current Implementation Status

✅ **Basic Express.js application setup**
✅ **MongoDB integration with Mongoose ORM**
✅ **Initial Socket.io implementation for real-time updates**
✅ **Basic schema design for gold price data**
✅ **Simple viewer page displaying price updates**

## Requirements to Implement

### 1. Kafka Message Broker Integration

- Implement a Publisher-Subscriber architecture using Kafka (already in package.json)
- Create a Kafka producer to publish price updates
- Create a Kafka consumer to process price updates and broadcast via Socket.io
- Configure Kafka topics for different gold vendors
- Document the message flow from publishing to consumption

### 2. Enhanced UI Dashboard

- Transform viewer.html into a professional dashboard using Bootstrap or Tailwind CSS
- Implement interactive price charts with Chart.js or D3.js
- Add historical price visualization with filtering options
- Create a responsive layout that works on all device sizes
- Add vendor comparison features and data tables
- Include visual indicators for price changes (up/down)

### 3. Performance Optimization

- Implement Redis caching to reduce MongoDB load
- Add database query optimization techniques
- Set up connection pooling for MongoDB
- Optimize Socket.io connections for scalability
- Implement rate limiting for API endpoints

### 4. System Architecture Improvements

- Restructure the application using modular design patterns
- Implement proper error handling and logging
- Add input validation for all API endpoints
- Create a configuration management system
- Implement environment-specific settings

### 5. Performance Analysis and Documentation

- Create benchmarks for before/after performance comparison
- Measure and document:
  - Request throughput (requests per second)
  - Response latency (average, p95, p99)
  - Database query performance
  - Memory and CPU usage
  - WebSocket connection scalability
- Document all architectural decisions and improvements

## Expected Deliverables

1. **Enhanced codebase** with all implemented features
2. **Documentation**:
   - Architecture diagram and explanation
   - API documentation
   - Installation instructions
   - Configuration guide
   - Performance improvement report with metrics
3. **Deployment instructions** for production environment

## Implementation Guidelines

- Maintain backward compatibility with existing APIs
- Follow best practices for Node.js/Express applications
- Use modern JavaScript features (async/await, ES6+)
- Implement proper security measures (input validation, rate limiting)
- Write clean, well-commented code
- Create a modular, maintainable architecture

## Testing

- Include unit tests for core functionality
- Add load testing scripts to validate performance claims
- Provide instructions for running tests

The completed project should demonstrate significant improvements in performance, scalability, and user experience compared to the original implementation..
