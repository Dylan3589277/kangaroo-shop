// 日本邮编格式：XXX-XXXX
export interface ShippingAddress {
  name: string;
  postalCode: string;    // 格式：XXX-XXXX
  prefecture: string;    // 都道府県（例：大阪府）
  city: string;         // 市区町村（例：大阪市北区）
  address1: string;     // 町名・番地
  address2?: string;    // 建物名・部屋番号
  phone: string;
  email: string;
}

// 日本都道府県列表
export const JAPAN_PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
] as const;

export type Prefecture = typeof JAPAN_PREFECTURES[number];

// 快递公司
export type Courier = 'sagawa' | 'yuubin' | 'yamato';

export interface ShippingOption {
  courier: Courier;
  name: string;
  nameEn: string;
  fee: number;           // 円
  estimatedDays: string; // 例：'1〜2日'
  description: string;   // 説明
}

// 运费计算（按重量区间，单位：克）
function calculateWeightFee(weight: number): number {
  if (weight <= 1000) return 700;   // 〜1kg: 700円
  if (weight <= 2000) return 900;   // 〜2kg: 900円
  if (weight <= 5000) return 1200;  // 〜5kg: 1200円
  if (weight <= 10000) return 1500; // 〜10kg: 1500円
  if (weight <= 20000) return 2000; // 〜20kg: 2000円
  return 2500;                       // 20kg超: 2500円
}

// 获取所有配送选项
export function getShippingOptions(totalWeight: number): ShippingOption[] {
  const baseFee = calculateWeightFee(totalWeight);

  return [
    {
      courier: 'yamato',
      name: 'ヤマト運輸（宅急便）',
      nameEn: 'Yamato Transport',
      fee: Math.round(baseFee * 1.1), // ヤマト稍微贵一点
      estimatedDays: '1〜2日',
      description: '時間帯指定対応、翌日お届け可能',
    },
    {
      courier: 'sagawa',
      name: '佐川急便',
      nameEn: 'Sagawa Express',
      fee: baseFee,
      estimatedDays: '1〜2日',
      description: '中型、大型荷物に強い',
    },
    {
      courier: 'yuubin',
      name: '日本郵便（クリックポスト）',
      nameEn: 'Japan Post',
      fee: Math.round(baseFee * 0.85), // 邮政最便宜
      estimatedDays: '2〜4日',
      description: '補償なし、小さな荷物向き',
    },
  ];
}

// 日本邮编格式校验
export function validatePostalCode(code: string): boolean {
  return /^\d{3}-\d{4}$/.test(code);
}

// 都道府県码（用于API）
export const PREFECTURE_CODES: Record<string, string> = {
  '北海道': '01', '青森県': '02', '岩手県': '03', '宮城県': '04', '秋田県': '05',
  '山形県': '06', '福島県': '07', '茨城県': '08', '栃木県': '09', '群馬県': '10',
  '埼玉県': '11', '千葉県': '12', '東京都': '13', '神奈川県': '14', '新潟県': '15',
  '富山県': '16', '石川県': '17', '福井県': '18', '山梨県': '19', '長野県': '20',
  '岐阜県': '21', '静岡県': '22', '愛知県': '23', '三重県': '24', '滋賀県': '25',
  '京都府': '26', '大阪府': '27', '兵庫県': '28', '奈良県': '29', '和歌山県': '30',
  '鳥取県': '31', '島根県': '32', '岡山県': '33', '広島県': '34', '山口県': '35',
  '徳島県': '36', '香川県': '37', '愛媛県': '38', '高知県': '39', '福岡県': '40',
  '佐賀県': '41', '長崎県': '42', '熊本県': '43', '大分県': '44', '宮崎県': '45',
  '鹿児島県': '46', '沖縄県': '47',
};
