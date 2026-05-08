import { describe, expect, it } from 'vitest';
import { formatProductUrlPreviewError } from './product-url-preview-error';

describe('formatProductUrlPreviewError', () => {
  it('includes stable error fields for screenshot debugging', () => {
    expect(formatProductUrlPreviewError({
      error: '未能从该页面读取到商品信息',
      code: 'PARSE_EMPTY',
      category: 'parse_empty',
      reason: '页面特征疑似反爬、验证码或访问限制。',
    }, '商品信息读取失败')).toBe(
      '未能从该页面读取到商品信息 [PARSE_EMPTY / parse_empty / 页面特征疑似反爬、验证码或访问限制。]'
    );
  });

  it('falls back when the response does not contain structured fields', () => {
    expect(formatProductUrlPreviewError({}, '商品信息读取失败')).toBe('商品信息读取失败');
  });
});
