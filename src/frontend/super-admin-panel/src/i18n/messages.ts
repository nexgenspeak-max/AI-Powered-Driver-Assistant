import type { OpsNavGroupId, OpsNavMessageKey } from '../layouts/navRegistry'
import type { OpsLocale } from './localeRegistry'

export type OpsMessages = {
  groups: Record<OpsNavGroupId, string>
  nav: Record<OpsNavMessageKey, { label: string; description: string }>
  shell: {
    searchPlaceholder: string
    signOut: string
    openMenu: string
    noSearchResults: string
    sectionsFooter: (count: number) => string
    fallbackName: string
    fallbackRole: string
    language: string
  }
  cascade: {
    shared: string
    allSections: string
    allFiles: string
    viewing: string
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
  overview: {
    up: string
    down: string
    latency: (ms: number) => string
    empty: string
    refresh: string
    servicesUp: string
    locales: string
    tools: string
    prompts: string
    defaultLocale: string
    readOnly: string
  }
  agent: {
    source: string
    updated: string
    defaultLocale: string
    stt: string
    llm: string
    tts: string
    provider: string
    model: string
    language: string
    voice: string
    googleModel: string
    googleLocation: string
    googleVoice: string
    elevenlabsModel: string
    livekit: string
    livekitUrl: string
    agentName: string
    locales: string
    secrets: string
    keySet: string
    keyMissing: string
    envPublic: string
    faq: string
    silence: string
    enabled: string
    disabled: string
    empty: string
  }
  tools: {
    name: string
    section: string
    audience: string
    locales: string
    empty: string
    driver: string
    customer: string
    search: string
    missingSchema: string
  }
  prompts: {
    search: string
    empty: string
    liveHint: string
    bytes: (n: number) => string
  }
  logs: {
    service: string
    allServices: string
    room: string
    conv: string
    query: string
    live: string
    paused: string
    empty: string
    connecting: string
    disconnected: string
  }
  calls: {
    caller: string
    started: string
    duration: string
    summary: string
    empty: string
    transcript: string
    noSummary: string
    assistant: string
    callerTurn: string
    close: string
  }
}

export const OPS_MESSAGES: Record<OpsLocale, OpsMessages> = {
  en: {
    groups: {
      observe: 'System',
      agent: 'Voice assistant',
      activity: 'Activity',
    },
    nav: {
      overview: {
        label: 'Overview',
        description: 'Backend service health. Voice counts refresh from the files on disk.',
      },
      agent: {
        label: 'STT, LLM, TTS',
        description: 'Read-only view of voice-agent env and locales/manifest.yaml. Edit the file, then restart the worker for runtime. This page reloads from disk every few seconds.',
      },
      tools: {
        label: 'Tools',
        description: 'Function tools on disk, grouped by the section comments in tools_definition.py. Adding a tool file or changing a schema shows up here without a catalog in Super Admin.',
      },
      prompts: {
        label: 'Prompts',
        description: 'YAML greetings, system instructions, and tools_definition.py as stored in voice-agent. Edit a file and this page shows the new text.',
      },
      logs: {
        label: 'Logs',
        description: 'Live tail. Filter by service, room, or conversation id.',
      },
      calls: {
        label: 'Calls',
        description: 'Call records and transcripts via ops-service.',
      },
    },
    shell: {
      searchPlaceholder: 'Search',
      signOut: 'Sign out',
      openMenu: 'Open navigation menu',
      noSearchResults: 'No pages match your search.',
      sectionsFooter: count => `${count} sections · ops`,
      fallbackName: 'Super Admin',
      fallbackRole: 'Ops',
      language: 'UI language',
    },
    cascade: {
      shared: 'Shared',
      allSections: 'All sections',
      allFiles: 'All files',
      viewing: 'Viewing',
    },
    login: {
      title: 'Super Admin',
      subtitle: 'Sign in with a super_admin account',
      email: 'Email',
      password: 'Password',
      submit: 'Sign in',
      accessDenied: 'This account does not have Super Admin access.',
      failed: 'Sign-in failed. Please check your credentials.',
    },
    overview: {
      up: 'Up',
      down: 'Down',
      latency: ms => `${ms} ms`,
      empty: 'No status data yet.',
      refresh: 'Refresh',
      servicesUp: 'Services up',
      locales: 'Locales',
      tools: 'Tools',
      prompts: 'Prompt files',
      defaultLocale: 'Default locale',
      readOnly: 'Super Admin only reads files. Change voice-agent env, then restart the worker for the new models to run.',
    },
    agent: {
      source: 'Config file',
      updated: 'File last written',
      defaultLocale: 'Default locale',
      stt: 'STT',
      llm: 'LLM',
      tts: 'TTS',
      provider: 'Provider',
      model: 'Model',
      language: 'Language',
      voice: 'Voice',
      googleModel: 'Google STT model',
      googleLocation: 'Google STT region',
      googleVoice: 'Google TTS voice',
      elevenlabsModel: 'ElevenLabs model',
      livekit: 'LiveKit',
      livekitUrl: 'URL',
      agentName: 'Agent name',
      locales: 'Locale bundles (manifest.yaml)',
      secrets: 'API keys present (values never shown)',
      keySet: 'Set',
      keyMissing: 'Missing',
      envPublic: 'Every non-secret env key in that file',
      faq: 'FAQ RAG',
      silence: 'Silence tracker',
      enabled: 'On',
      disabled: 'Off',
      empty: 'Could not load agent config from disk.',
    },
    tools: {
      name: 'Tool',
      section: 'Section',
      audience: 'Audience',
      locales: 'Locales',
      empty: 'No tools found on disk.',
      driver: 'Driver',
      customer: 'Customer',
      search: 'Filter by name or description',
      missingSchema: 'On disk, missing from tools_definition.py',
    },
    prompts: {
      search: 'Filter by path',
      empty: 'No prompt files found.',
      liveHint: 'Text is re-read from disk on this page. Saving a YAML or Python prompt in voice-agent updates what you see here.',
      bytes: n => `${n} bytes`,
    },
    logs: {
      service: 'Service',
      allServices: 'All services',
      room: 'room',
      conv: 'conv',
      query: 'Contains',
      live: 'Live',
      paused: 'Paused',
      empty: 'No matching lines yet. Start a session and filter by room=.',
      connecting: 'Connecting…',
      disconnected: 'Disconnected',
    },
    calls: {
      caller: 'Caller',
      started: 'Started',
      duration: 'Duration',
      summary: 'Summary',
      empty: 'No call records.',
      transcript: 'Transcript',
      noSummary: 'No summary available',
      assistant: 'Assistant',
      callerTurn: 'Caller',
      close: 'Close',
    },
  },
  vi: {
    groups: {
      observe: 'Hệ thống',
      agent: 'Trợ lý thoại',
      activity: 'Nhật ký',
    },
    nav: {
      overview: {
        label: 'Tổng quan',
        description: 'Tình trạng các dịch vụ backend. Số locale, tool và prompt lấy từ file trên disk.',
      },
      agent: {
        label: 'STT, LLM, TTS',
        description: 'Đọc file env và manifest.yaml của voice-agent. Sửa file rồi khởi động lại worker thì mô hình mới mới chạy. Trang này tự đọc lại disk vài giây một lần.',
      },
      tools: {
        label: 'Công cụ',
        description: 'Các hàm tool trên disk, nhóm theo dòng mục trong tools_definition.py. Thêm file tool hoặc sửa schema thì Super Admin hiện ra — không có danh sách cứng trong Super Admin.',
      },
      prompts: {
        label: 'Prompt',
        description: 'Lời chào YAML, system instructions và tools_definition.py đúng như trong voice-agent. Sửa file là trang này hiện nội dung mới.',
      },
      logs: {
        label: 'Logs',
        description: 'Theo dõi log trực tiếp. Lọc theo service, room hoặc conv.',
      },
      calls: {
        label: 'Cuộc gọi',
        description: 'Bản ghi cuộc gọi và lời thoại qua ops-service.',
      },
    },
    shell: {
      searchPlaceholder: 'Tìm trang',
      signOut: 'Đăng xuất',
      openMenu: 'Mở menu điều hướng',
      noSearchResults: 'Không có mục nào khớp tìm kiếm.',
      sectionsFooter: count => `${count} mục · ops`,
      fallbackName: 'Super Admin',
      fallbackRole: 'Vận hành',
      language: 'Ngôn ngữ giao diện',
    },
    cascade: {
      shared: 'Dùng chung',
      allSections: 'Mọi mục',
      allFiles: 'Mọi file',
      viewing: 'Đang xem',
    },
    login: {
      title: 'Super Admin',
      subtitle: 'Đăng nhập bằng tài khoản super_admin',
      email: 'Email',
      password: 'Mật khẩu',
      submit: 'Đăng nhập',
      accessDenied: 'Tài khoản này không có quyền Super Admin.',
      failed: 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.',
    },
    overview: {
      up: 'Hoạt động',
      down: 'Ngừng',
      latency: ms => `${ms} ms`,
      empty: 'Chưa có dữ liệu trạng thái.',
      refresh: 'Làm mới',
      servicesUp: 'Dịch vụ chạy',
      locales: 'Gói ngôn ngữ',
      tools: 'Công cụ',
      prompts: 'File prompt',
      defaultLocale: 'Locale mặc định',
      readOnly: 'Super Admin chỉ đọc file. Sửa env voice-agent rồi khởi động lại worker thì mô hình mới mới chạy.',
    },
    agent: {
      source: 'File cấu hình',
      updated: 'File ghi lần cuối',
      defaultLocale: 'Locale mặc định',
      stt: 'STT',
      llm: 'LLM',
      tts: 'TTS',
      provider: 'Nhà cung cấp',
      model: 'Mô hình',
      language: 'Ngôn ngữ',
      voice: 'Giọng',
      googleModel: 'Mô hình Google STT',
      googleLocation: 'Vùng Google STT',
      googleVoice: 'Giọng Google TTS',
      elevenlabsModel: 'Mô hình ElevenLabs',
      livekit: 'LiveKit',
      livekitUrl: 'URL',
      agentName: 'Tên agent',
      locales: 'Gói ngôn ngữ (manifest.yaml)',
      secrets: 'Khóa API đã có (không hiện giá trị)',
      keySet: 'Có',
      keyMissing: 'Thiếu',
      envPublic: 'Mọi biến env trong file, trừ secret',
      faq: 'FAQ RAG',
      silence: 'Theo dõi im lặng',
      enabled: 'Bật',
      disabled: 'Tắt',
      empty: 'Không đọc được cấu hình agent từ disk.',
    },
    tools: {
      name: 'Tool',
      section: 'Mục',
      audience: 'Đối tượng',
      locales: 'Locale',
      empty: 'Không thấy tool trên disk.',
      driver: 'Tài xế',
      customer: 'Khách',
      search: 'Lọc theo tên hoặc mô tả',
      missingSchema: 'Có file trên disk, chưa có trong tools_definition.py',
    },
    prompts: {
      search: 'Lọc theo đường dẫn',
      empty: 'Không thấy file prompt.',
      liveHint: 'Trang này đọc lại disk mỗi lần tải. Lưu YAML hoặc Python prompt trong voice-agent thì nội dung ở đây đổi theo.',
      bytes: n => `${n} byte`,
    },
    logs: {
      service: 'Dịch vụ',
      allServices: 'Mọi dịch vụ',
      room: 'room',
      conv: 'conv',
      query: 'Chứa',
      live: 'Trực tiếp',
      paused: 'Tạm dừng',
      empty: 'Chưa có dòng khớp. Bắt đầu phiên và lọc room=.',
      connecting: 'Đang kết nối…',
      disconnected: 'Mất kết nối',
    },
    calls: {
      caller: 'Người gọi',
      started: 'Bắt đầu',
      duration: 'Thời lượng',
      summary: 'Tóm tắt',
      empty: 'Không có bản ghi cuộc gọi.',
      transcript: 'Lời thoại',
      noSummary: 'Không có tóm tắt',
      assistant: 'Trợ lý',
      callerTurn: 'Người gọi',
      close: 'Đóng',
    },
  },
}
