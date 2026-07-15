export type FaqItem = {
  question: string
  answer: string
}

export const ABOUT_TITLE = 'Czen - Trợ lý đặt xe thông minh'

export const ABOUT_PARAGRAPHS = [
  'Czen là nền tảng đặt xe tích hợp trợ lý AI 3D, giúp bạn đặt chuyến đi chỉ bằng vài câu nói thay vì thao tác thủ công.',
  'Chỉ cần bấm vào biểu tượng micro và nói điểm đến, trợ lý sẽ tự động tìm tài xế phù hợp, theo dõi hành trình và trả lời mọi thắc mắc của bạn trong suốt chuyến đi.',
  'Mọi thông tin chuyến đi đều được cập nhật theo thời gian thực để bạn luôn yên tâm trên mỗi hành trình.',
]

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Làm sao để đặt xe?',
    answer: 'Nhập điểm đến vào ô tìm kiếm ở đầu trang, hoặc bấm vào biểu tượng micro để nói chuyện trực tiếp với trợ lý AI và yêu cầu đặt xe bằng giọng nói.',
  },
  {
    question: 'Tôi có thể hủy chuyến đã đặt không?',
    answer: 'Có. Bạn có thể yêu cầu trợ lý AI hủy giúp, hoặc vào trang trạng thái chuyến đi để hủy trực tiếp.',
  },
  {
    question: 'Trợ lý AI hoạt động như thế nào?',
    answer: 'Trợ lý lắng nghe yêu cầu bằng giọng nói, hiểu điểm đến của bạn và tự động tìm, gọi tài xế phù hợp gần nhất.',
  },
  {
    question: 'Tôi có thể thanh toán bằng cách nào?',
    answer: 'Czen hỗ trợ thanh toán tiền mặt và các ví điện tử phổ biến tùy theo khu vực hoạt động.',
  },
  {
    question: 'Làm sao để liên hệ với tài xế?',
    answer: 'Sau khi đặt xe thành công, bạn có thể gọi trực tiếp cho tài xế ngay trong ứng dụng để trao đổi thêm.',
  },
]
