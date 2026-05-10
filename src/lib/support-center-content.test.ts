import { describe, expect, it } from 'vitest';
import {
  supportFaqItems,
  supportReplyTemplates,
  supportSafetyRules,
  supportStatusGuides,
  supportTicketSteps,
} from './support-center-content';

describe('support-center-content', () => {
  it('documents ticket workflow, FAQ, templates and safety rules', () => {
    expect(supportTicketSteps.length).toBeGreaterThanOrEqual(5);
    expect(supportFaqItems.length).toBeGreaterThanOrEqual(5);
    expect(supportReplyTemplates.length).toBeGreaterThanOrEqual(4);
    expect(supportStatusGuides.map((item) => item.status)).toContain('paid');
    expect(supportSafetyRules.join('\n')).toContain('只读查询');
  });

  it('keeps high-risk after-sales replies as escalation only', () => {
    const escalation = supportReplyTemplates.find((item) => item.title.includes('高风险'));

    expect(escalation).toBeDefined();
    expect(escalation?.body).toContain('升级');
    expect(escalation?.body).not.toContain('已经退款');
    expect(escalation?.body).not.toContain('一定补发');
  });

  it('keeps privacy FAQ focused on masked data', () => {
    const privacy = supportFaqItems.find((item) => item.category === '隐私');

    expect(privacy).toBeDefined();
    expect(privacy?.answer).toContain('不要');
    expect(privacy?.answer).toContain('完整');
    expect(privacy?.answer).toContain('手机号');
  });
});
