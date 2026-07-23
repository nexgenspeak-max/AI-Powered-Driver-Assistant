export type FaqItem = {
  question: string
  answer: string
}

export const ABOUT_TITLE = 'Czen Driver - Trợ lý dành cho tài xế'

export const ABOUT_PARAGRAPHS = [
  'Czen Driver là ứng dụng dành cho tài xế, tích hợp trợ lý AI giúp bạn tra cứu chuyến đi và xử lý công việc nhanh chóng chỉ bằng giọng nói.',
  'Chỉ cần bấm vào biểu tượng micro, trợ lý sẽ giúp bạn tra cứu thông tin chuyến đi hiện tại, liên hệ khách hàng, hoặc trả lời các thắc mắc trong lúc chạy xe.',
  'Mọi chuyến đi và thu nhập của bạn đều được cập nhật theo thời gian thực trên trang tổng quan.',
]

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Làm sao để nhận chuyến mới?',
    answer: 'Chuyến mới sẽ tự động hiển thị trên trang tổng quan (Dashboard), bạn có thể xem chi tiết và xác nhận nhận chuyến ngay tại đó.',
  },
  {
    question: 'Làm sao để liên hệ với khách hàng?',
    answer: 'Bấm vào chuyến đi đang thực hiện để gọi trực tiếp cho khách hàng, hoặc nhờ trợ lý AI kết nối giúp bạn.',
  },
  {
    question: 'Trợ lý AI hỗ trợ tài xế những gì?',
    answer: 'Trợ lý giúp tra cứu thông tin chuyến đi, trả lời câu hỏi và hỗ trợ xử lý sự cố nhanh chóng bằng giọng nói.',
  },
  {
    question: 'Tôi có thể xem lại các chuyến đã hoàn thành ở đâu?',
    answer: 'Bạn có thể xem lại lịch sử các chuyến đi đã hoàn thành trong mục danh sách chuyến trên trang tổng quan.',
  },
  {
    question: 'Làm sao để cập nhật thông tin cá nhân?',
    answer: 'Vào trang hồ sơ tài xế để chỉnh sửa thông tin liên hệ và các giấy tờ liên quan.',
  },
]
