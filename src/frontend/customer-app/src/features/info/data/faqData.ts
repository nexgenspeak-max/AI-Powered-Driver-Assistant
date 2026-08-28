export type FaqItem = {
  question: string
  answer: string
}

export const ABOUT_TITLE = 'Czen - Đặt xe thông minh cùng trợ lý AI'

export const ABOUT_PARAGRAPHS = [
  'Czen là nền tảng đặt xe tích hợp trợ lý AI giọng nói. Chỉ cần chạm vào biểu tượng trợ lý luôn nổi trên màn hình để đặt xe, theo dõi chuyến đi hay hỏi bất cứ điều gì, thay vì thao tác thủ công.',
  'Nhập điểm đón - điểm đến hoặc nói trực tiếp với trợ lý, ứng dụng sẽ tự động tìm tài xế phù hợp gần bạn nhất và theo dõi hành trình theo thời gian thực trên bản đồ.',
  'Trong lúc chờ xe hoặc trong chuyến đi, bạn có thể nhờ trợ lý AI xem trạng thái chuyến, thời gian tài xế đến (ETA), gọi tài xế, hoặc hủy chuyến - tất cả chỉ bằng giọng nói.',
  'Ứng dụng còn hỗ trợ lưu địa chỉ yêu thích, quản lý phương thức thanh toán, xem ưu đãi và giới thiệu bạn bè để nhận thưởng.',
]

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Làm sao để đặt xe?',
    answer: 'Nhập điểm đón và điểm đến ở màn hình đặt xe, hoặc chạm vào biểu tượng trợ lý AI nổi trên màn hình và nói yêu cầu đặt xe bằng giọng nói.',
  },
  {
    question: 'Trợ lý AI trong ứng dụng hoạt động như thế nào?',
    answer: 'Chạm vào biểu tượng trợ lý ở bất kỳ màn hình nào để nói chuyện trực tiếp. Trợ lý có thể đặt xe, tra cứu trạng thái chuyến, cho biết tài xế còn cách bao xa (ETA), gọi tài xế hoặc hủy chuyến giúp bạn.',
  },
  {
    question: 'Làm sao để theo dõi chuyến đi đang diễn ra?',
    answer: 'Vào mục Chuyến đi để xem vị trí tài xế theo thời gian thực và trạng thái từng bước của chuyến, hoặc hỏi trực tiếp trợ lý AI.',
  },
  {
    question: 'Tôi có thể hủy chuyến đã đặt không?',
    answer: 'Có. Vào trang trạng thái chuyến để hủy trực tiếp, hoặc nhờ trợ lý AI hủy giúp bằng giọng nói.',
  },
  {
    question: 'Làm sao để liên hệ với tài xế?',
    answer: 'Sau khi được ghép tài xế, bạn có thể gọi trực tiếp ngay trong ứng dụng, hoặc nhờ trợ lý AI gọi giúp và cho biết tài xế còn cách bao xa.',
  },
  {
    question: 'Tôi có thể thanh toán bằng cách nào?',
    answer: 'Vào mục Phương thức thanh toán để thêm hoặc quản lý ví điện tử, hoặc chọn thanh toán tiền mặt tùy theo khu vực hoạt động.',
  },
  {
    question: 'Làm sao để lưu địa chỉ nhà/công ty cho lần đặt xe sau?',
    answer: 'Vào mục Địa chỉ đã lưu để thêm các địa điểm thường dùng, giúp những lần đặt xe sau nhanh hơn.',
  },
  {
    question: 'Ứng dụng có ưu đãi hay chương trình giới thiệu bạn bè không?',
    answer: 'Có. Vào mục Ưu đãi để xem các khuyến mãi hiện có, hoặc mục Giới thiệu bạn bè để nhận thưởng khi mời người khác dùng Czen.',
  },
]
