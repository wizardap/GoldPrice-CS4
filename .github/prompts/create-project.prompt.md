# Prompt cho AI Agent Phát triển Dự án Gold Price Monitoring

## Bối cảnh

Tôi cần nâng cấp một ứng dụng đơn giản theo dõi giá vàng thời gian thực. Ứng dụng hiện tại sử dụng Express.js với SQLite và polling để cập nhật dữ liệu.

Ví dụ cụ thể: Người dùng muốn xem giá vàng SJC, hệ thống sẽ hiển thị giá vàng SJC mới nhất và tự động cập nhật khi có thay đổi. Đơn giản vậy thôi.

## Yêu cầu chính

- Thay thế polling bằng Socket.IO để giảm tải server và cập nhật giá vàng ngay lập tức
- Sử dụng Sequelize và TimescaleDB để lưu trữ lịch sử giá vàng theo thời gian
- Triển khai mô hình Publisher-Subscriber với Kafka (có khả năng thay thế sau này)
- Thêm Redis làm cache đơn giản cho giá vàng mới nhất
- Đủ khả năng xử lý 1000 người dùng xem giá vàng đồng thời

## Cấu trúc hiện tại

- `server.js`: Express server với 3 API endpoints (/add, /get/:id, /viewer/:id)
- `utils.js`: Thao tác với SQLite database
- `viewer.html`: Trang web với polling mỗi 2 giây

## Yêu cầu triển khai

1. **Giữ nguyên chức năng cơ bản**: Thêm/cập nhật giá vàng và xem giá vàng
2. **Cấu trúc đơn giản** nhưng dễ bảo trì và mở rộng
3. **Hướng dẫn cài đặt** ngắn gọn, dễ hiểu
4. **Mã nguồn tối giản** nhưng dễ hiểu

## Dữ liệu mẫu

Giá vàng sẽ có dạng:

```json
{
  "SJC": {
    "buy": 74500000,
    "sell": 77020000,
    "unit": "VND/lượng",
    "updated_at": "2023-04-22T08:30:00Z"
  },
  "DOJI": {
    "buy": 74450000,
    "sell": 76950000,
    "unit": "VND/lượng",
    "updated_at": "2023-04-22T08:32:00Z"
  }
}
```
