export type FaqItem = {
  question: string
  answer: string
}

export const ABOUT_TITLE = 'Czen — trợ lý giọng nói đồng hành cùng tài xế'

export const ABOUT_PARAGRAPHS = [
  'Czen là ứng dụng dành cho tài xế, tích hợp trợ lý AI bằng giọng nói giúp bạn nhận chuyến, chỉ đường và xử lý công việc nhanh chóng mà không cần rời tay khỏi vô lăng.',
  'Bật "Chế độ rảnh tay" trong Cài đặt trợ lý để gọi trợ lý bất cứ lúc nào: xác nhận/từ chối chuyến mới, xem lộ trình tối ưu cho chuyến nhiều điểm giao, chỉ đường từng chặng, gọi hoặc nhắn tin cho khách và người thân, tra cứu thu nhập, thưởng, hay báo cáo sự cố.',
  'Khi bạn đến gần điểm đón hoặc trả khách, ứng dụng tự động nhận diện vị trí để nhắc nhở hoặc gợi ý điểm dừng tiếp theo, giúp bạn tập trung lái xe an toàn hơn.',
  'Mọi chuyến đi, thu nhập và vị trí của bạn đều được cập nhật theo thời gian thực ngay trên trang tổng quan.',
]

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Làm sao để nhận chuyến mới?',
    answer: 'Chuyến mới hiển thị dưới dạng banner kèm âm báo trên trang tổng quan (Dashboard); bạn có thể xác nhận hoặc từ chối ngay tại đó, hoặc nhờ trợ lý AI xác nhận giúp bằng giọng nói.',
  },
  {
    question: 'Chế độ rảnh tay (trợ lý AI) hoạt động như thế nào?',
    answer: 'Bật "Chế độ rảnh tay" trong mục Cài đặt trợ lý để gọi trợ lý bằng giọng nói mà không cần chạm màn hình. Trợ lý có thể xác nhận/từ chối chuyến, chỉ đường, gọi hoặc nhắn tin cho khách, tra cứu thu nhập và nhiều việc khác.',
  },
  {
    question: 'Làm sao để tối ưu lộ trình khi chuyến có nhiều điểm giao?',
    answer: 'Với chuyến có nhiều điểm dừng, mở tab Chuyến đi → Đang chạy để xem lộ trình tối ưu do hệ thống sắp xếp, hoặc nhờ trợ lý AI đọc thứ tự các điểm giúp bạn đi quãng đường ngắn nhất. Trên bản đồ vẫn thấy đường và số thứ tự điểm.',
  },
  {
    question: 'Ứng dụng có chỉ đường từng chặng không?',
    answer: 'Có. Khi bắt đầu chuyến, màn hình điều hướng hiển thị chỉ dẫn từng chặng (turn-by-turn) và tự động cập nhật theo vị trí thực tế của bạn trong suốt hành trình.',
  },
  {
    question: 'Ứng dụng có tự nhắc khi tôi đến gần điểm đón/trả khách không?',
    answer: 'Có, nếu bạn bật "Thông báo khi gần điểm đón" hoặc "Tự động gợi ý điểm dừng tiếp theo" trong Cài đặt trợ lý, ứng dụng sẽ tự nhắc hoặc gợi ý ngay khi bạn vào gần khu vực đó.',
  },
  {
    question: 'Làm sao để liên hệ với khách hàng?',
    answer: 'Bấm vào chuyến đi đang thực hiện để gọi hoặc nhắn tin trực tiếp cho khách, hoặc nhờ trợ lý AI kết nối giúp bằng giọng nói.',
  },
  {
    question: 'Xem thu nhập và tiền thưởng ở đâu?',
    answer: 'Vào mục Thu nhập trên trang tổng quan để xem chi tiết, hoặc hỏi trực tiếp trợ lý AI về thu nhập hôm nay, thống kê chuyến đi hay tiền thưởng.',
  },
  {
    question: 'Làm sao để cập nhật thông tin xe, giấy tờ hoặc tài khoản ngân hàng?',
    answer: 'Vào trang Hồ sơ để chỉnh sửa thông tin liên hệ, thông tin xe, giấy tờ và tài khoản ngân hàng nhận tiền.',
  },
  {
    question: 'Gặp sự cố trong lúc chạy chuyến thì làm sao?',
    answer: 'Bạn có thể báo sự cố qua mục Hỗ trợ, hoặc nhờ trợ lý AI báo cáo sự cố hay tình trạng khách không có mặt ngay trong lúc chạy xe, không cần dừng xe thao tác thủ công.',
  },
]
