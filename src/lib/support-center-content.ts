export type SupportFaqItem = {
  category: string;
  question: string;
  answer: string;
  tags: string[];
};

export type SupportReplyTemplate = {
  title: string;
  scenario: string;
  body: string;
  checklist: string[];
};

export type SupportTicketStep = {
  title: string;
  description: string;
  owner: string;
  sla: string;
};

export const supportTicketSteps: SupportTicketStep[] = [
  {
    title: '1. 建单',
    description: '在 tawk.to 或台账中记录客户问题，必须填写来源、语言、订单号或邮箱、问题类型、当前状态。不要记录完整卡号、支付密钥、完整地址截图等敏感信息。',
    owner: '客服',
    sla: '收到咨询后 10 分钟内',
  },
  {
    title: '2. 查单',
    description: '先用本页面只读查单，确认订单号、支付状态、商品摘要、物流方式和脱敏联系方式。页面只显示脱敏信息，不能改订单。',
    owner: '客服',
    sla: '建单后 15 分钟内',
  },
  {
    title: '3. 分流',
    description: '普通咨询直接回复；支付异常、退款、改地址、补发、赔偿等高风险问题升级给花哥确认。客服不得直接承诺退款、赔偿或补发。',
    owner: '客服 + 花哥',
    sla: '普通 30 分钟内；升级问题当天标记',
  },
  {
    title: '4. 回填',
    description: '把处理结果写回工单台账：处理动作、客户是否已回复、下一步跟进时间、负责人。',
    owner: '客服',
    sla: '每次回复后立即回填',
  },
  {
    title: '5. 复盘',
    description: '每周汇总高频问题，补充 FAQ 和模板。涉及产品页、支付页、物流说明不清楚的问题，交给运营或开发优化。',
    owner: '花小妹/客服',
    sla: '每周一次',
  },
];

export const supportFaqItems: SupportFaqItem[] = [
  {
    category: '订单',
    question: '客户说找不到订单怎么办？',
    answer: '请让客户提供订单号或下单邮箱。客服在后台只读查单页搜索订单号或邮箱，确认存在后只回复必要状态，不发送完整邮箱、手机号、地址等敏感信息。',
    tags: ['订单号', '邮箱', '查单'],
  },
  {
    category: '支付',
    question: '客户说已经付款但订单未更新怎么办？',
    answer: '先查询订单支付状态。如果仍为 pending（待支付），请回复客户我们会核对支付记录，不要承诺已收款；涉及 Stripe/PayPal 真实支付记录时升级给花哥或管理员处理。',
    tags: ['支付状态', 'Stripe', 'PayPal'],
  },
  {
    category: '物流',
    question: '客户询问发货方式或物流进度怎么办？',
    answer: '先确认订单状态和 courier（配送方式）。如果后台暂无追踪号，只能说明“正在处理中/待发货”，不要编造物流单号或预计到达日。',
    tags: ['物流', '配送方式', '追踪号'],
  },
  {
    category: '售后',
    question: '客户要求退款、赔偿、补发怎么办？',
    answer: '先登记工单和订单状态，安抚客户并说明会升级核实。客服不得直接承诺退款、赔偿、补发或改地址，必须交给花哥确认。',
    tags: ['退款', '赔偿', '补发', '升级'],
  },
  {
    category: '隐私',
    question: '客户要求核对个人信息怎么办？',
    answer: '只核对部分信息，例如邮箱前两位和域名、手机号后四位、城市/都道府县。不要在聊天里完整展示客户手机号、地址、支付信息。',
    tags: ['隐私', '脱敏', '个人信息'],
  },
];

export const supportReplyTemplates: SupportReplyTemplate[] = [
  {
    title: '订单状态确认',
    scenario: '客户询问订单是否成功',
    body: '您好，我们已收到您的咨询。请提供订单号或下单邮箱，我们会为您核对订单状态。为保护您的隐私，请不要发送完整支付卡号或密码。',
    checklist: ['已索要订单号或邮箱', '未要求客户发送支付敏感信息', '已准备查单'],
  },
  {
    title: '支付待核实',
    scenario: '客户称已付款但后台显示待支付',
    body: '您好，我们正在为您核对支付状态。由于支付平台确认可能有延迟，我们会先检查订单记录，再给您回复。请您暂时不要重复付款，避免产生重复订单。',
    checklist: ['已记录订单号', '已检查 paymentStatus', '未承诺已收款或退款'],
  },
  {
    title: '物流进度说明',
    scenario: '客户询问物流状态',
    body: '您好，我们已为您查看订单，目前订单正在处理中。若有物流追踪号，我们会第一时间更新给您。感谢您的耐心等待。',
    checklist: ['已确认 courier', '未编造追踪号', '必要时已升级运营'],
  },
  {
    title: '高风险售后升级',
    scenario: '退款、赔偿、补发、改地址',
    body: '您好，您的问题我们已经记录。由于这类处理需要核对订单和支付/物流记录，我们会升级给负责人确认后再回复您。感谢理解。',
    checklist: ['已标记升级', '未直接承诺退款/赔偿/补发', '已写入台账下一步'],
  },
];

export const supportStatusGuides = [
  { status: 'pending', label: '待支付', meaning: '订单已创建但支付未确认。客服只能提示客户核对支付流程，不要承诺已收款。' },
  { status: 'paid', label: '已支付', meaning: '支付已确认。可继续核对商品和物流处理状态。' },
  { status: 'failed', label: '支付失败', meaning: '支付未成功。可请客户重新尝试或更换支付方式。' },
  { status: 'cancelled', label: '已取消', meaning: '订单已取消。是否恢复或重下单需按实际业务规则处理。' },
  { status: 'refunded', label: '已退款', meaning: '订单已退款。客服可说明已处理，但不要主动披露支付流水细节。' },
] as const;

export const supportSafetyRules = [
  '只读查询：客服后台页面不能修改订单、退款、补发、改地址。',
  '脱敏展示：页面只显示脱敏邮箱、脱敏手机、城市/都道府县，不展示完整地址和支付流水。',
  '最小必要：回复客户时只说解决问题所需信息，不复制后台完整记录。',
  '高风险升级：退款、赔偿、补发、改地址、支付争议必须升级给花哥确认。',
  '不编造：没有物流单号、预计到达日或支付确认时，必须说“正在核实”，不能瞎编。',
];
