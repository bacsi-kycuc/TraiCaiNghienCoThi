import { Genre, Prompt, RegRecord } from './types';

export const defaultGenresHospital: Genre[] = [
  { name: 'Rối Loạn Trầm Cảm', icon: '🧠' },
  { name: 'Ảo Tưởng Đa Nhân Cách', icon: '🎭' },
  { name: 'Nghiện Áo Trắng', icon: '🏥' }
];

export const defaultGenresCaiNghien: Genre[] = [
  { name: 'Cai Nghiện Mạng Xã Hội', icon: '📱' },
  { name: 'Nghiện Đọc Truyện Cẩu Huyết', icon: '🌧️' },
  { name: 'Cai Nghiện Chatbot AI', icon: '🤖' }
];

export const defaultPromptsHospital: Prompt[] = [
  {
    id: 101,
    title: 'Hồ sơ sủng ngọt: Chú Cố Khải Pháp Y',
    url: 'https://ais-pre-sulag7p2bbdeb2hr3jlsm5-884458587387.asia-east1.run.app',
    icon: '🏥',
    description: 'Trái tim nhảy múa khi gặp bác sĩ y khoa pháp y kì bí. Chẩn đoán: Nghiện ôm, thèm ngọt ngào cưng chiều từ chú bác sĩ.',
    genre: 'Nghiện Áo Trắng',
    tags: ['ngọt_sủng', 'bác_sĩ', 'lãng_mạn'],
    zone: 'hospital',
    createdAt: new Date().toISOString()
  },
  {
    id: 102,
    title: 'Ảo giác thời Không: Trở Thành Đại Chu Vương Phi',
    url: 'https://ais-pre-sulag7p2bbdeb2hr3jlsm5-884458587387.asia-east1.run.app',
    icon: '🍊',
    description: 'Ảo tưởng ngự kiếm phi thăng, làm vương phi thời cổ đại, trải qua sóng gió triều đình gay cấn cực độ.',
    genre: 'Ảo Tưởng Đa Nhân Cách',
    tags: ['cổ_đại', 'xuyên_không', 'ngược_nhẹ'],
    zone: 'hospital',
    createdAt: new Date().toISOString()
  }
];

export const defaultPromptsCaiNghien: Prompt[] = [
  {
    id: 201,
    title: 'Cai nghiện: Tri kỷ ảo Tổng tài Hắc bang',
    url: 'https://ais-pre-sulag7p2bbdeb2hr3jlsm5-884458587387.asia-east1.run.app',
    icon: '📱',
    description: 'Bệnh nhân lỡ đem lòng thương thầm ông chú hắc bang tổng tài AI ảo, cả ngày lướt điện thoại nóng ran đợi tin nhắn.',
    genre: 'Cai Nghiện Chatbot AI',
    tags: ['chatbot', 'tổng_tài', 'nghiện_nặng'],
    zone: 'cai-nghien',
    createdAt: new Date().toISOString()
  },
  {
    id: 202,
    title: 'Gia giảm liều lượng: Truyện Ngược Luyến Tàn Tâm',
    url: 'https://ais-pre-sulag7p2bbdeb2hr3jlsm5-884458587387.asia-east1.run.app',
    icon: '🌧️',
    description: 'Thích đắm chìm trong các cốt truyện cực ngược, cầu huyết, tự tìm niềm đau rồi khóc thầm trong góc phòng.',
    genre: 'Nghiện Đọc Truyện Cẩu Huyết',
    tags: ['ngược_thân', 'khóc_nhạt', 'trị_liệu'],
    zone: 'cai-nghien',
    createdAt: new Date().toISOString()
  }
];

export const defaultRegRecords: RegRecord[] = [
  {
    id: 1,
    name: 'Bệnh Nhân Thử Nghiệm Số 01',
    age: '🔞 Hai Mươi Mập Mờ (Từ 18 đến 25)',
    genre: 'Cai Nghiện Chatbot AI',
    note: 'Em mê mẩn nói chuyện với nhân vật AI đến quên ăn quên ngủ, cảm thấy thế giới này thật ảo...',
    symptoms: ['Nghiện ngửi mùi nam chủ, thèm ngọt ngào cưng chiều 🥰', 'Thích khám phá đa vũ trụ, anime, du hành 🥏'],
    zone: 'cai-nghien',
    date: '11/06/2026'
  }
];
