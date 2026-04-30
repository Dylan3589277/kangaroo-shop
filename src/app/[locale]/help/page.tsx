import type { Metadata } from 'next';
import { buildIndexableMetadata } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const titles: Record<string, string> = {
    ja: 'ヘルプ・よくある質問',
    zh: '帮助中心 / 常见问题',
    en: 'Help Center / FAQ',
  };
  const descriptions: Record<string, string> = {
    ja: '注文・支払い・配送・返品・アカウントに関するよくある質問をまとめています。解決しない場合はチャットサポートをご利用ください。',
    zh: '汇总了下单、支付、配送、退换货及账户相关的常见问题。如无法解决请点击右下角联系人工客服。',
    en: 'Find answers to common questions about ordering, payment, shipping, returns, and your account. Chat support is available in the bottom-right corner.',
  };
  return buildIndexableMetadata({
    locale,
    path: '/help',
    title: titles[locale] ?? titles.en,
    description: descriptions[locale] ?? descriptions.en,
  });
}

/* ------------------------------------------------------------------ */
/* Shared style tokens                                                   */
/* ------------------------------------------------------------------ */

const sectionStyle: React.CSSProperties = {
  marginBottom: 'var(--space-10)',
};

const categoryTitleStyle: React.CSSProperties = {
  fontSize: 'var(--text-xl)',
  fontWeight: 700,
  marginBottom: 'var(--space-4)',
  paddingBottom: 'var(--space-2)',
  borderBottom: '2px solid var(--color-primary)',
  color: 'var(--color-text)',
};

const faqItemStyle: React.CSSProperties = {
  marginBottom: 'var(--space-4)',
};

const questionStyle: React.CSSProperties = {
  fontWeight: 600,
  color: 'var(--color-text)',
  marginBottom: 'var(--space-1)',
  fontSize: 'var(--text-base)',
};

const answerStyle: React.CSSProperties = {
  color: 'var(--color-text-secondary)',
  lineHeight: 1.75,
  fontSize: 'var(--text-sm)',
};

const warningBoxStyle: React.CSSProperties = {
  background: 'var(--color-surface-secondary, #f9f9f9)',
  border: '1px solid var(--color-border, #e5e7eb)',
  borderRadius: 8,
  padding: 'var(--space-4)',
  marginBottom: 'var(--space-6)',
  fontSize: 'var(--text-sm)',
  color: 'var(--color-text-secondary)',
  lineHeight: 1.75,
};

const ctaBoxStyle: React.CSSProperties = {
  background: 'var(--color-primary)',
  borderRadius: 8,
  padding: 'var(--space-6)',
  textAlign: 'center',
  color: '#fff',
  marginTop: 'var(--space-8)',
};

/* ------------------------------------------------------------------ */
/* Page — Chinese                                                        */
/* ------------------------------------------------------------------ */

function HelpZh() {
  return (
    <main
      className="container"
      style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)', maxWidth: 800 }}
    >
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>
        帮助中心 / 常见问题
      </h1>
      <p style={{ ...answerStyle, marginBottom: 'var(--space-8)' }}>
        遇到问题？请先查阅下方常见问题。如仍无法解决，请点击页面右下角的客服按钮联系在线客服。
      </p>

      {/* 安全边界提示 */}
      <div style={warningBoxStyle}>
        <strong>⚠️ 重要提示：</strong>涉及退款金额争议、赔偿申请、修改收货地址、更换物流方式、订单异常等复杂情况，
        请通过右下角客服按钮联系人工客服处理，本页面的自助指引不代表任何退款或赔偿承诺。
      </div>

      {/* 1. 下单 / 支付 */}
      <div style={sectionStyle}>
        <h2 style={categoryTitleStyle}>🛒 下单 / 支付</h2>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：如何下单？</p>
          <p style={answerStyle}>
            选择商品 → 加入购物车 → 填写收货地址 → 选择支付方式 → 确认下单。
            支持信用卡、PayPal 等常见支付方式。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：支持哪些支付方式？</p>
          <p style={answerStyle}>
            目前支持 Visa、Mastercard、American Express 及 PayPal。
            所有支付均通过加密通道处理，我们不存储您的卡号信息。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：下单后可以取消吗？</p>
          <p style={answerStyle}>
            订单确认后 2 小时内可申请取消。超时或已发货则无法取消，请联系客服确认实际状态。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：付款失败怎么办？</p>
          <p style={answerStyle}>
            请检查卡号信息是否正确、余额是否充足，或尝试更换支付方式。
            如多次失败，请联系您的银行确认是否有拦截。
          </p>
        </div>
      </div>

      {/* 2. 配送 / 物流 */}
      <div style={sectionStyle}>
        <h2 style={categoryTitleStyle}>🚚 配送 / 物流</h2>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：商品从哪里发货？</p>
          <p style={answerStyle}>
            所有商品均从中国仓库直接发货，运往日本、欧美及全球各地。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：需要多久才能收到货？</p>
          <p style={answerStyle}>
            通常在支付确认后 3–7 个工作日内发货，国际运输约 7–21 天到达（因目的地国家和物流线路而异）。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：如何查询物流信息？</p>
          <p style={answerStyle}>
            发货后您将收到包含快递单号的邮件，可在对应物流公司官网或第三方平台查询轨迹。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：收件地址填写错误怎么办？</p>
          <p style={answerStyle}>
            请立即通过右下角客服按钮联系人工客服。地址修改需要人工审核，发货后恕无法保证修改成功。
          </p>
        </div>
      </div>

      {/* 3. 退换 / 售后 */}
      <div style={sectionStyle}>
        <h2 style={categoryTitleStyle}>🔄 退换 / 售后</h2>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：收到商品有质量问题怎么处理？</p>
          <p style={answerStyle}>
            请在签收后 7 天内联系客服并提供照片或视频作为凭证。人工客服会根据实际情况审核并给出处理方案。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：如何申请退货？</p>
          <p style={answerStyle}>
            通过右下角客服按钮联系人工客服，说明退货原因并提供订单号，客服将指导您完成退货流程。
            <br />
            <em>请注意：退款金额、赔偿及运费承担等具体方案均由人工客服最终确认，本页面不作任何承诺。</em>
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：退款需要多久？</p>
          <p style={answerStyle}>
            退款到账时间取决于退货审核结果及您的支付方式，通常在审核通过后 5–10 个工作日内处理。
            具体时间以客服通知为准。
          </p>
        </div>
      </div>

      {/* 4. 账户 / 隐私 */}
      <div style={sectionStyle}>
        <h2 style={categoryTitleStyle}>👤 账户 / 隐私</h2>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：如何修改账户信息？</p>
          <p style={answerStyle}>
            登录后前往「账户设置」页面可修改邮箱、密码和收货地址信息。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：我的个人信息会被分享给第三方吗？</p>
          <p style={answerStyle}>
            我们严格遵守隐私政策，不会将您的个人信息出售给第三方。
            详情请查阅{' '}
            <a href="/zh/privacy" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
              隐私政策
            </a>
            。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：忘记密码怎么办？</p>
          <p style={answerStyle}>
            在登录页面点击「忘记密码」，输入注册邮箱后即可收到重置链接。
          </p>
        </div>
      </div>

      {/* 5. 联系客服 */}
      <div style={sectionStyle}>
        <h2 style={categoryTitleStyle}>💬 联系客服</h2>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：如何联系在线客服？</p>
          <p style={answerStyle}>
            点击页面右下角的客服悬浮按钮，即可与在线客服实时沟通。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：客服工作时间是什么？</p>
          <p style={answerStyle}>
            在线客服工作时间为北京时间周一至周五 9:00–18:00。
            节假日期间可能有所调整，非工作时间内的留言将在下一工作日回复。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：也可以发送邮件联系吗？</p>
          <p style={answerStyle}>
            可以，请发送邮件至{' '}
            <a href="mailto:contact@kangarookun.com" style={{ color: 'var(--color-primary)' }}>
              contact@kangarookun.com
            </a>
            ，我们将在 1–2 个工作日内回复。
          </p>
        </div>
      </div>

      <div style={ctaBoxStyle}>
        <p style={{ fontWeight: 700, fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
          仍然有疑问？
        </p>
        <p style={{ fontSize: 'var(--text-sm)', opacity: 0.9, margin: 0 }}>
          点击页面右下角的客服按钮，联系人工客服获取个性化帮助。
        </p>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Page — Japanese                                                       */
/* ------------------------------------------------------------------ */

function HelpJa() {
  return (
    <main
      className="container"
      style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)', maxWidth: 800 }}
    >
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>
        ヘルプ・よくある質問
      </h1>
      <p style={{ ...answerStyle, marginBottom: 'var(--space-8)' }}>
        ご不明な点はまずこちらでご確認ください。解決しない場合は、ページ右下のチャットボタンからカスタマーサポートへお問い合わせください。
      </p>

      {/* 安全境界提示 */}
      <div style={warningBoxStyle}>
        <strong>⚠️ ご注意：</strong>返金金額の争議、損害賠償申請、お届け先住所の変更、配送方法の変更、注文トラブルなど複雑なケースは、
        右下のチャットボタンからオペレーターへご連絡ください。このページの案内は返金・賠償をお約束するものではありません。
      </div>

      {/* 1. ご注文・お支払い */}
      <div style={sectionStyle}>
        <h2 style={categoryTitleStyle}>🛒 ご注文・お支払い</h2>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：注文はどうすればできますか？</p>
          <p style={answerStyle}>
            商品を選びカートに追加 → お届け先を入力 → お支払い方法を選択 → 注文確定の手順でお買い物いただけます。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：使えるお支払い方法を教えてください。</p>
          <p style={answerStyle}>
            Visa・Mastercard・American Express・PayPal に対応しています。
            お支払い情報は暗号化通信で処理され、カード番号は保存いたしません。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：注文後にキャンセルできますか？</p>
          <p style={answerStyle}>
            注文確定から 2 時間以内であればキャンセル申請が可能です。
            それ以降または発送済みの場合はキャンセルできない場合があります。詳細はサポートへご確認ください。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：決済に失敗した場合は？</p>
          <p style={answerStyle}>
            カード情報・残高・カードの海外利用設定をご確認ください。
            それでも解決しない場合は別のお支払い方法をお試しいただくか、カード会社へお問い合わせください。
          </p>
        </div>
      </div>

      {/* 2. 配送・物流 */}
      <div style={sectionStyle}>
        <h2 style={categoryTitleStyle}>🚚 配送・物流</h2>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：どこから発送されますか？</p>
          <p style={answerStyle}>
            すべての商品は中国の倉庫から直接発送します。日本・欧米・世界各地へお届けします。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：到着まで何日かかりますか？</p>
          <p style={answerStyle}>
            お支払い確認後、通常 3〜7 営業日以内に発送します。
            国際輸送は配送先・物流ルートにより 7〜21 日程度かかります。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：荷物の追跡はできますか？</p>
          <p style={answerStyle}>
            発送完了後、追跡番号をメールでお知らせします。各配送会社のサイトまたは荷物追跡サービスでご確認いただけます。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：お届け先住所を間違えてしまいました。</p>
          <p style={answerStyle}>
            すぐに右下のチャットボタンよりオペレーターへご連絡ください。
            発送後の住所変更は保証できかねる場合があります。
          </p>
        </div>
      </div>

      {/* 3. 返品・アフターサービス */}
      <div style={sectionStyle}>
        <h2 style={categoryTitleStyle}>🔄 返品・アフターサービス</h2>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：届いた商品に不良がありました。</p>
          <p style={answerStyle}>
            受取後 7 日以内に写真・動画を添えてサポートへご連絡ください。オペレーターが状況を確認し、個別に対応方法をご案内します。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：返品するにはどうすればよいですか？</p>
          <p style={answerStyle}>
            右下のチャットボタンからオペレーターへ注文番号と理由をお伝えください。返品手順をご案内します。
            <br />
            <em>※ 返金額・補償・送料負担などの具体的な内容はオペレーターが最終確認します。このページは返金・賠償を保証するものではありません。</em>
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：返金まで何日かかりますか？</p>
          <p style={answerStyle}>
            返品確認後、通常 5〜10 営業日以内に処理します。
            正確な日程はサポートからお知らせします。
          </p>
        </div>
      </div>

      {/* 4. アカウント・プライバシー */}
      <div style={sectionStyle}>
        <h2 style={categoryTitleStyle}>👤 アカウント・プライバシー</h2>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：アカウント情報の変更方法は？</p>
          <p style={answerStyle}>
            ログイン後、「アカウント設定」からメールアドレス・パスワード・お届け先住所を変更できます。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：個人情報は第三者に提供されますか？</p>
          <p style={answerStyle}>
            お客様の個人情報を第三者に販売することはありません。詳細は
            {' '}
            <a href="/ja/privacy" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
              プライバシーポリシー
            </a>
            {' '}をご確認ください。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：パスワードを忘れました。</p>
          <p style={answerStyle}>
            ログインページの「パスワードをお忘れですか？」をクリックし、登録メールアドレスを入力してください。再設定用リンクをお送りします。
          </p>
        </div>
      </div>

      {/* 5. サポートへのお問い合わせ */}
      <div style={sectionStyle}>
        <h2 style={categoryTitleStyle}>💬 サポートへのお問い合わせ</h2>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：カスタマーサポートへの連絡方法は？</p>
          <p style={answerStyle}>
            ページ右下のチャットボタンからオペレーターとリアルタイムでやり取りできます。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：サポートの対応時間は？</p>
          <p style={answerStyle}>
            オンラインサポートは北京時間（BJT）月〜金 9:00〜18:00 です。
            祝日は対応時間が変わる場合があります。時間外のメッセージは翌営業日に対応します。
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q：メールで問い合わせることはできますか？</p>
          <p style={answerStyle}>
            はい。
            {' '}
            <a href="mailto:contact@kangarookun.com" style={{ color: 'var(--color-primary)' }}>
              contact@kangarookun.com
            </a>
            {' '}へご連絡ください。1〜2 営業日以内に返信いたします。
          </p>
        </div>
      </div>

      <div style={ctaBoxStyle}>
        <p style={{ fontWeight: 700, fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
          まだご不明な点がありますか？
        </p>
        <p style={{ fontSize: 'var(--text-sm)', opacity: 0.9, margin: 0 }}>
          ページ右下のチャットボタンからオペレーターへ直接お問い合わせいただけます。
        </p>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Page — English (and all other locales fallback)                      */
/* ------------------------------------------------------------------ */

function HelpEn() {
  return (
    <main
      className="container"
      style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-16)', maxWidth: 800 }}
    >
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>
        Help Center / FAQ
      </h1>
      <p style={{ ...answerStyle, marginBottom: 'var(--space-8)' }}>
        Find answers to common questions below. Still need help? Click the chat button in the bottom-right corner to reach our support team.
      </p>

      {/* Safety boundary notice */}
      <div style={warningBoxStyle}>
        <strong>⚠️ Important:</strong> For refund disputes, compensation claims, delivery address changes, shipping method changes,
        or any abnormal order situation, please contact a human agent via the chat button below.
        This page does not constitute any refund or compensation guarantee.
      </div>

      {/* 1. Ordering & Payment */}
      <div style={sectionStyle}>
        <h2 style={categoryTitleStyle}>🛒 Ordering &amp; Payment</h2>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: How do I place an order?</p>
          <p style={answerStyle}>
            Browse products → add to cart → enter your shipping address → choose a payment method → confirm. It&apos;s that simple.
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: What payment methods are accepted?</p>
          <p style={answerStyle}>
            We accept Visa, Mastercard, American Express, and PayPal. All transactions are encrypted; we never store your card number.
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: Can I cancel my order after placing it?</p>
          <p style={answerStyle}>
            Cancellation requests within 2 hours of order confirmation can usually be accommodated.
            After that, or once shipped, cancellation may not be possible. Contact support to check the current status.
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: My payment failed. What should I do?</p>
          <p style={answerStyle}>
            Check your card details, available balance, and whether international transactions are enabled.
            If the issue persists, try a different payment method or contact your bank.
          </p>
        </div>
      </div>

      {/* 2. Shipping & Logistics */}
      <div style={sectionStyle}>
        <h2 style={categoryTitleStyle}>🚚 Shipping &amp; Logistics</h2>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: Where are orders shipped from?</p>
          <p style={answerStyle}>
            All orders are shipped directly from our warehouse in China to Japan, Europe, North America, and worldwide.
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: How long does delivery take?</p>
          <p style={answerStyle}>
            Orders are typically dispatched within 3–7 business days after payment confirmation.
            International shipping then takes 7–21 days depending on your destination and chosen carrier.
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: How can I track my package?</p>
          <p style={answerStyle}>
            You will receive a tracking number by email once your order ships. Use it on the carrier&apos;s website or a parcel-tracking service.
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: I entered the wrong delivery address. Can it be changed?</p>
          <p style={answerStyle}>
            Please contact a human agent immediately via the chat button. Address changes after shipment cannot be guaranteed.
          </p>
        </div>
      </div>

      {/* 3. Returns & After-Sales */}
      <div style={sectionStyle}>
        <h2 style={categoryTitleStyle}>🔄 Returns &amp; After-Sales</h2>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: I received a defective item. What should I do?</p>
          <p style={answerStyle}>
            Contact our support team within 7 days of receipt with photos or video evidence.
            A human agent will review the case and provide the available options.
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: How do I request a return?</p>
          <p style={answerStyle}>
            Use the chat button to reach a human agent. Provide your order number and the reason for the return.
            <br />
            <em>Note: Refund amounts, compensation, and return shipping costs are determined case-by-case by our support team.
            This page makes no specific refund or compensation commitments.</em>
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: How long does a refund take?</p>
          <p style={answerStyle}>
            Refunds are typically processed within 5–10 business days after we confirm receipt of the returned item.
            Actual timing depends on your payment provider. Your support agent will confirm the schedule.
          </p>
        </div>
      </div>

      {/* 4. Account & Privacy */}
      <div style={sectionStyle}>
        <h2 style={categoryTitleStyle}>👤 Account &amp; Privacy</h2>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: How do I update my account details?</p>
          <p style={answerStyle}>
            Log in and go to &quot;Account Settings&quot; to change your email address, password, or saved addresses.
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: Will my personal data be shared with third parties?</p>
          <p style={answerStyle}>
            We never sell your personal information. For full details, please read our{' '}
            <a href="/en/privacy" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
              Privacy Policy
            </a>
            .
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: I forgot my password. How do I reset it?</p>
          <p style={answerStyle}>
            Click &quot;Forgot password?&quot; on the login page, enter your registered email address, and we&apos;ll send you a reset link.
          </p>
        </div>
      </div>

      {/* 5. Contact Support */}
      <div style={sectionStyle}>
        <h2 style={categoryTitleStyle}>💬 Contact Support</h2>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: How do I reach customer support?</p>
          <p style={answerStyle}>
            Click the chat bubble in the bottom-right corner of any page to start a live conversation with our support team.
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: What are your support hours?</p>
          <p style={answerStyle}>
            Live chat is available Monday–Friday 9:00–18:00 Beijing Time (BJT). Hours may vary on public holidays.
            Messages sent outside these hours will be answered on the next business day.
          </p>
        </div>
        <div style={faqItemStyle}>
          <p style={questionStyle}>Q: Can I contact you by email?</p>
          <p style={answerStyle}>
            Yes. Email us at{' '}
            <a href="mailto:contact@kangarookun.com" style={{ color: 'var(--color-primary)' }}>
              contact@kangarookun.com
            </a>
            {' '}and we will reply within 1–2 business days.
          </p>
        </div>
      </div>

      <div style={ctaBoxStyle}>
        <p style={{ fontWeight: 700, fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
          Still have questions?
        </p>
        <p style={{ fontSize: 'var(--text-sm)', opacity: 0.9, margin: 0 }}>
          Click the chat button in the bottom-right corner to talk to a live agent right now.
        </p>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Route export                                                          */
/* ------------------------------------------------------------------ */

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale === 'zh') return <HelpZh />;
  if (locale === 'ja') return <HelpJa />;
  return <HelpEn />;
}
