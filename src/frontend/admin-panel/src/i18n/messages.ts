import type { TripStatus } from '../types/trip'
import type { AdminNavGroupId, AdminNavMessageKey } from '../layouts/navRegistry'
import type { AdminLocale } from './localeRegistry'

export type AdminContentMessages = {
  common: {
    all: string
    lock: string
    unlock: string
    dispatch: string
    selectDriver: string
    view: string
    records: (n: number) => string
    noTrips: string
    noDrivers: string
    noCustomers: string
    noCallLogs: string
    filterByPhone: string
    callLogsHint: string
    confirmLock: (name: string) => string
    online: string
    offline: string
    locked: string
  }
  tripStatus: Record<TripStatus, string>
  stats: {
    pending: string
    active: string
    completed: string
    driversOnline: string
    totalDrivers: string
    totalCustomers: string
  }
  table: {
    trip: {
      tripId: string
      customer: string
      pickup: string
      dropoff: string
      status: string
      assignDriver: string
      bookedVia: string
      accountName: string
    }
    driver: {
      name: string
      phone: string
      status: string
      registered: string
      actions: string
    }
    customer: {
      name: string
      phone: string
      email: string
      status: string
      joined: string
      actions: string
    }
    callLogs: {
      caller: string
      started: string
      duration: string
      summary: string
    }
  }
  createTrip: {
    driver: string
    customerName: string
    customerPhone: string
    pickupAddress: string
    dropoffAddress: string
    pickupTime: string
    cancel: string
    submit: string
    submitting: string
    failed: string
    ph: {
      customerName: string
      customerPhone: string
      pickup: string
      dropoff: string
      pickupTime: string
    }
  }
  transcript: {
    title: string
    summary: string
    noSummary: string
    roleAssistant: string
    roleDriver: string
    close: string
  }
}

export type AdminMessages = {
  groups: Record<AdminNavGroupId, string>
  nav: Record<AdminNavMessageKey, { label: string; description: string }>
  shell: {
    searchPlaceholder: string
    signOut: string
    openMenu: string
    noSearchResults: string
    sectionsFooter: (count: number) => string
    fallbackAdmin: string
    fallbackRole: string
    language: string
    collapseSidebar: string
    expandSidebar: string
    search: string
  }
  login: {
    title: string
    subtitle: string
    email: string
    password: string
    submit: string
    accessDenied: string
    failed: string
  }
  content: AdminContentMessages
}

const TRIP_STATUS_EN: Record<TripStatus, string> = {
  pending: 'Pending',
  notified: 'Notified',
  calling: 'Calling',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  no_answer: 'No answer',
  completed: 'Completed',
  cancelled: 'Cancelled',
  cancelled_by_driver: 'Cancelled by driver',
  no_show: 'No show',
  arrived_pickup: 'Arrived pickup',
  picked_up: 'Picked up',
}

const TRIP_STATUS_VI: Record<TripStatus, string> = {
  pending: 'Chờ xử lý',
  notified: 'Đã thông báo',
  calling: 'Đang gọi',
  confirmed: 'Đã xác nhận',
  rejected: 'Từ chối',
  no_answer: 'Không trả lời',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  cancelled_by_driver: 'TX hủy',
  no_show: 'Khách không đến',
  arrived_pickup: 'Đã đến điểm đón',
  picked_up: 'Đã đón khách',
}

const CONTENT_EN: AdminContentMessages = {
  common: {
    all: 'All',
    lock: 'Lock',
    unlock: 'Unlock',
    dispatch: 'Dispatch',
    selectDriver: 'Select driver…',
    view: 'View →',
    records: n => `${n} record${n !== 1 ? 's' : ''}`,
    noTrips: 'No trips found',
    noDrivers: 'No drivers registered',
    noCustomers: 'No customers registered',
    noCallLogs: 'No call records found',
    filterByPhone: 'Filter by phone…',
    callLogsHint: 'Auto-refreshes every 10s · Click a row to view transcript',
    confirmLock: name => `Lock ${name}'s account? They won't be able to log in.`,
    online: 'Online',
    offline: 'Offline',
    locked: 'Locked',
  },
  tripStatus: TRIP_STATUS_EN,
  stats: {
    pending: 'Pending',
    active: 'Active',
    completed: 'Completed',
    driversOnline: 'Drivers online',
    totalDrivers: 'Total drivers',
    totalCustomers: 'Total customers',
  },
  table: {
    trip: {
      tripId: 'Trip ID',
      customer: 'Customer',
      pickup: 'Pickup',
      dropoff: 'Dropoff',
      status: 'Status',
      assignDriver: 'Assign driver',
      bookedVia: 'Booked via',
      accountName: 'Account name',
    },
    driver: {
      name: 'Name',
      phone: 'Phone',
      status: 'Status',
      registered: 'Registered',
      actions: 'Actions',
    },
    customer: {
      name: 'Name',
      phone: 'Phone',
      email: 'Email',
      status: 'Status',
      joined: 'Joined',
      actions: 'Actions',
    },
    callLogs: {
      caller: 'Caller',
      started: 'Started',
      duration: 'Duration',
      summary: 'Summary',
    },
  },
  createTrip: {
    driver: 'Driver',
    customerName: 'Customer name',
    customerPhone: 'Customer phone',
    pickupAddress: 'Pickup address',
    dropoffAddress: 'Dropoff address',
    pickupTime: 'Pickup time',
    cancel: 'Cancel',
    submit: 'Create & notify driver',
    submitting: 'Creating…',
    failed: 'Failed to create trip',
    ph: {
      customerName: 'Nguyễn Văn A',
      customerPhone: '+84901234567',
      pickup: '123 Lê Lợi, District 1',
      dropoff: '45 Nguyễn Huệ, District 1',
      pickupTime: '14:30',
    },
  },
  transcript: {
    title: 'Call transcript',
    summary: 'Summary',
    noSummary: 'No summary available',
    roleAssistant: 'AI agent',
    roleDriver: 'Driver',
    close: 'Close',
  },
}

const CONTENT_VI: AdminContentMessages = {
  common: {
    all: 'Tất cả',
    lock: 'Khóa',
    unlock: 'Mở khóa',
    dispatch: 'Điều phối',
    selectDriver: 'Chọn tài xế…',
    view: 'Xem →',
    records: n => `${n} bản ghi`,
    noTrips: 'Không có chuyến nào',
    noDrivers: 'Chưa có tài xế',
    noCustomers: 'Chưa có khách hàng',
    noCallLogs: 'Không có cuộc gọi',
    filterByPhone: 'Lọc theo SĐT…',
    callLogsHint: 'Tự làm mới mỗi 10s · Bấm dòng để xem bản ghi',
    confirmLock: name => `Khóa tài khoản ${name}? Họ sẽ không đăng nhập được.`,
    online: 'Trực tuyến',
    offline: 'Ngoại tuyến',
    locked: 'Đã khóa',
  },
  tripStatus: TRIP_STATUS_VI,
  stats: {
    pending: 'Chờ xử lý',
    active: 'Đang chạy',
    completed: 'Hoàn thành',
    driversOnline: 'TX online',
    totalDrivers: 'Tổng tài xế',
    totalCustomers: 'Tổng khách hàng',
  },
  table: {
    trip: {
      tripId: 'Mã chuyến',
      customer: 'Khách',
      pickup: 'Điểm đón',
      dropoff: 'Điểm trả',
      status: 'Trạng thái',
      assignDriver: 'Gán tài xế',
      bookedVia: 'Kênh đặt',
      accountName: 'Tài khoản',
    },
    driver: {
      name: 'Tên',
      phone: 'SĐT',
      status: 'Trạng thái',
      registered: 'Ngày đăng ký',
      actions: 'Thao tác',
    },
    customer: {
      name: 'Tên',
      phone: 'SĐT',
      email: 'Email',
      status: 'Trạng thái',
      joined: 'Ngày tham gia',
      actions: 'Thao tác',
    },
    callLogs: {
      caller: 'Người gọi',
      started: 'Bắt đầu',
      duration: 'Thời lượng',
      summary: 'Tóm tắt',
    },
  },
  createTrip: {
    driver: 'Tài xế',
    customerName: 'Tên khách',
    customerPhone: 'SĐT khách',
    pickupAddress: 'Điểm đón',
    dropoffAddress: 'Điểm trả',
    pickupTime: 'Giờ đón',
    cancel: 'Hủy',
    submit: 'Tạo & thông báo tài xế',
    submitting: 'Đang tạo…',
    failed: 'Tạo chuyến thất bại',
    ph: {
      customerName: 'Nguyễn Văn A',
      customerPhone: '+84901234567',
      pickup: '123 Lê Lợi, Quận 1',
      dropoff: '45 Nguyễn Huệ, Quận 1',
      pickupTime: '14:30',
    },
  },
  transcript: {
    title: 'Bản ghi cuộc gọi',
    summary: 'Tóm tắt',
    noSummary: 'Không có tóm tắt',
    roleAssistant: 'Trợ lý AI',
    roleDriver: 'Tài xế',
    close: 'Đóng',
  },
}

export const ADMIN_MESSAGES: Record<AdminLocale, AdminMessages> = {
  en: {
    groups: {
      operations: 'Operations',
      people: 'People',
      system: 'System',
    },
    nav: {
      tripBoard: {
        label: 'Trip Board',
        description: 'Monitor live trips, filter by status, and dispatch drivers.',
      },
      createTrip: {
        label: 'New Trip',
        description: 'Book a trip manually and notify the assigned driver.',
      },
      drivers: {
        label: 'Drivers',
        description: 'View driver accounts, online status, and lock controls.',
      },
      customers: {
        label: 'Customers',
        description: 'Browse customer accounts and activity.',
      },
      callLogs: {
        label: 'Call Logs',
        description: 'Review voice and phone call transcripts.',
      },
    },
    shell: {
      searchPlaceholder: 'Search settings',
      signOut: 'Sign out',
      openMenu: 'Open navigation menu',
      noSearchResults: 'No settings match your search.',
      sectionsFooter: count => `${count} sections · v1.0.0`,
      fallbackAdmin: 'Admin',
      fallbackRole: 'Dispatcher',
      language: 'Language',
      collapseSidebar: 'Collapse sidebar',
      expandSidebar: 'Expand sidebar',
      search: 'Search',
    },
    login: {
      title: 'Admin Panel',
      subtitle: 'Sign in to manage the system',
      email: 'Email',
      password: 'Password',
      submit: 'Sign in',
      accessDenied: 'This account does not have Admin Panel access.',
      failed: 'Sign-in failed. Please check your credentials.',
    },
    content: CONTENT_EN,
  },
  vi: {
    groups: {
      operations: 'Vận hành',
      people: 'Người dùng',
      system: 'Hệ thống',
    },
    nav: {
      tripBoard: {
        label: 'Bảng chuyến',
        description: 'Theo dõi chuyến đi, lọc trạng thái và điều phối tài xế.',
      },
      createTrip: {
        label: 'Tạo chuyến',
        description: 'Đặt chuyến thủ công và thông báo tài xế được gán.',
      },
      drivers: {
        label: 'Tài xế',
        description: 'Xem tài khoản tài xế, trạng thái online và khóa tài khoản.',
      },
      customers: {
        label: 'Khách hàng',
        description: 'Duyệt tài khoản và hoạt động khách hàng.',
      },
      callLogs: {
        label: 'Nhật ký cuộc gọi',
        description: 'Xem bản ghi thoại và cuộc gọi điện thoại.',
      },
    },
    shell: {
      searchPlaceholder: 'Tìm mục cài đặt',
      signOut: 'Đăng xuất',
      openMenu: 'Mở menu điều hướng',
      noSearchResults: 'Không có mục nào khớp tìm kiếm.',
      sectionsFooter: count => `${count} mục · v1.0.0`,
      fallbackAdmin: 'Quản trị',
      fallbackRole: 'Điều phối',
      language: 'Ngôn ngữ',
      collapseSidebar: 'Thu gọn sidebar',
      expandSidebar: 'Mở rộng sidebar',
      search: 'Tìm kiếm',
    },
    login: {
      title: 'Admin Panel',
      subtitle: 'Đăng nhập để quản lý hệ thống',
      email: 'Email',
      password: 'Mật khẩu',
      submit: 'Đăng nhập',
      accessDenied: 'Tài khoản này không có quyền truy cập Admin Panel.',
      failed: 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.',
    },
    content: CONTENT_VI,
  },
}
