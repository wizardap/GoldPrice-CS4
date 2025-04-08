# CASE STUDY 4
Dưới đây là một chương trình đơn giản sử dụng `express.js`, để ghi các giá trị vào database theo cặp key-value. Chương trình cung cấp một trang web liên tục cập nhật giá trị của key để gửi về kết quả mới, có thể được ứng dụng để cập nhật giá vàng, thông số theo *thời gian thực*. Chương trình có thể chưa hoàn toàn được tối ưu.

## Hướng dẫn cài đặt
```sh
# Cài đặt các gói liên quan
$ npm install
# Tạo folder cho database
$ mkdir db
# Khởi chạy ứng dụng
$ npm start 
```

## Mô Tả
| Endpoint | Phương thức | Mục tiêu
|--|:--:|--|
| /add | POST | Thêm/chỉnh sửa giá trị trong database
| /get/:keyID | GET | Trả về giá trị của keyID
| /viewer/:keyID | GET | Trang web theo dõi giá trị của keyID


## Yêu cầu triển khai
| Mức độ | Mô tả |
|--|--|
| ![Static Badge](https://img.shields.io/badge/OPTIONAL-medium-yellow)  | Tối ưu chương trình trên |
| ![Static Badge](https://img.shields.io/badge/OPTIONAL-easy-green) | Bổ sung giao diện web hoàn chỉnh hơn |
| ![Static Badge](https://img.shields.io/badge/OPTIONAL-easy-green) | Thay thế cơ sở dữ liệu hiện tại |
| ![Static Badge](https://img.shields.io/badge/REQUIRED-easy-green) | Thay thế công nghệ sử dụng cho việc gọi request liên tục trong `viewer.html` (VD: socket.io, ...) |
| ![Static Badge](https://img.shields.io/badge/REQUIRED-medium-yellow) | Thêm lớp persistent bằng cách sử dụng ORM (Object-Relational Mapping) |
| ![Static Badge](https://img.shields.io/badge/REQUIRED-medium-yellow) | Triển khai theo kiến trúc Publisher-Subscriber và cài đặt message broker tuỳ chọn |
| ![Static Badge](https://img.shields.io/badge/REQUIRED-medium-yellow) | Nêu các vấn đề chương trình gốc đang gặp phải về các thuộc tính chất lượng và *đánh giá* hiệu năng sau khi nâng cấp |

Ngoài ra, các bạn có thể tuỳ chọn bổ sung thêm một số phần triển khai khác.
Chương trình bạn mô tả sử dụng Express.js để quản lý dữ liệu kiểu key-value và cung cấp giao diện theo dõi giá trị theo thời gian thực. Mặc dù ý tưởng rõ ràng và có thể áp dụng cho các ứng dụng như giá vàng hoặc dữ liệu cảm biến, nhưng chương trình có thể gặp phải một số **vấn đề về chất lượng phần mềm**, bao gồm:

---

## ⚠️ Các vấn đề tiềm ẩn

### 1. **Tính nhất quán dữ liệu (Data Consistency)**
- Nếu có nhiều client cùng ghi (`POST /add`) vào cùng một `keyID` cùng lúc, dữ liệu có thể bị ghi đè lẫn nhau.
- Không có kiểm soát xung đột hoặc lock.

✅ *Giải pháp*: Cần cơ chế lock nhẹ, hoặc sử dụng hàng đợi (như Kafka) để serialize các thay đổi.

---

### 2. **Tính mở rộng (Scalability)**
- Express.js xử lý theo event-loop, nhưng nếu số lượng client `viewer` lớn và phải cập nhật liên tục (gợi ý là real-time), có thể gây **quá tải CPU** hoặc **memory leak** nếu không được tối ưu.
- Việc liên tục polling (nếu dùng AJAX) sẽ tốn băng thông và tài nguyên server.

✅ *Giải pháp*: Sử dụng WebSocket hoặc Server-Sent Events (SSE) để cập nhật real-time hiệu quả hơn.

---

### 3. **Tính sẵn sàng (Availability)**
- Nếu server Express.js sập, toàn bộ hệ thống ngưng hoạt động.
- Database backend chưa rõ (in-memory? file? MongoDB?) — nếu là in-memory thì sẽ mất dữ liệu khi server restart.

✅ *Giải pháp*: Chạy server dạng cluster, lưu dữ liệu vào database bền vững (như MongoDB, PostgreSQL).

---

### 4. **Bảo mật (Security)**
- Endpoint `/add` cho phép ghi dữ liệu mà không có **authentication/authorization** — bất kỳ ai cũng có thể sửa dữ liệu.
- `/viewer/:keyID` có thể lộ thông tin nhạy cảm nếu không kiểm soát truy cập.

✅ *Giải pháp*: Thêm xác thực (JWT, API key), phân quyền truy cập từng key.

---

### 5. **Tính phản hồi thời gian thực (Real-time Responsiveness)**
- Nếu client phải **poll liên tục `/get/:keyID` mỗi vài giây**, phản hồi không thực sự real-time và gây tải mạng.
  
✅ *Giải pháp*: Dùng WebSocket hoặc SSE để đẩy dữ liệu mới khi có thay đổi.

---

### 6. **Đảm bảo dữ liệu (Durability)**
- Nếu đang lưu trữ giá trị trong memory (`let database = {}` kiểu vậy), server restart là mất hết.

✅ *Giải pháp*: Dùng database bền vững (MongoDB, Redis, PostgreSQL...) và backup thường xuyên.

---

### 7. **Khả năng kiểm tra và giám sát (Observability)**
- Không rõ chương trình có log lỗi, giám sát truy cập, hoặc thống kê lưu lượng truy cập hay không.

✅ *Giải pháp*: Thêm logging (winston, morgan), metrics (Prometheus), và alerting.

---

## 🔍 Tóm tắt
| Thuộc tính chất lượng | Vấn đề tiềm ẩn                         | Giải pháp gợi ý               |
|----------------------|----------------------------------------|-------------------------------|
| Consistency          | Ghi đè giá trị, không có kiểm soát     | Hàng đợi, version control     |
| Scalability          | Polling tốn tài nguyên                 | WebSocket, Kafka              |
| Availability         | Single point of failure                | Cluster, database bền vững    |
| Security             | Không xác thực, truy cập tự do         | JWT/Auth                      |
| Responsiveness       | Không real-time thực sự                | WebSocket, SSE                |
| Durability           | Mất dữ liệu khi server crash           | MongoDB, Redis                |
| Observability        | Thiếu logging/monitoring               | Winston, Prometheus           |

---

Nếu bạn muốn mình giúp cải tiến đoạn code hiện tại với các điểm ở trên (ví dụ thêm WebSocket hoặc dùng MongoDB), gửi mình đoạn code bạn đang có nha!

