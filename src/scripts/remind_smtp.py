#!/usr/bin/env python3
"""
remind_smtp.py — 检查 SMTP 配置并在未配置时提醒花哥

用法:
  python3 src/scripts/remind_smtp.py

此脚本由 Hermes cron 定期运行。
当 SMTP 未配置时，通过飞书发送提醒。
"""
import os
import sys

# 添加项目根目录到 path（用于加载 dotenv）
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, PROJECT_ROOT)

def check_smtp_configured():
    """检查 SMTP 环境变量是否已配置"""
    host = os.environ.get('SMTP_HOST', os.getenv('SMTP_HOST', ''))
    user = os.environ.get('SMTP_USER', os.getenv('SMTP_USER', ''))
    password = os.environ.get('SMTP_PASS', os.getenv('SMTP_PASS', ''))
    return bool(host and user and password)

def send_feishu_reminder():
    """通过飞书 API 发送提醒消息给花哥"""
    # 飞书应用凭证（花小妹机器人）
    app_id = os.environ.get('FEISHU_APP_ID', '')
    app_secret = os.environ.get('FEISHU_APP_SECRET', '')
    user_open_id = 'ou_97f5fd5152a855e4e827dfddeab59f5d'  # 花哥 open_id

    if not app_id or not app_secret:
        print('[Remind SMTP] 飞书凭证未配置，跳过发送')
        return

    try:
        # 获取 tenant_access_token
        import urllib.request
        import json

        token_url = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal'
        req = urllib.request.Request(
            token_url,
            data=json.dumps({'app_id': app_id, 'app_secret': app_secret}).encode(),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            token_data = json.loads(resp.read())
        token = token_data.get('tenant_access_token', '')
        if not token:
            print('[Remind SMTP] 无法获取 tenant_access_token')
            return

        # 发送消息
        message = {
            'open_id': user_open_id,
            'msg_type': 'text',
            'content': json.dumps({
                'text': (
                    '🦘 袋鼠君 SMTP 邮件通知未配置！\n\n'
                    '网站订单确认邮件无法真正发出。\n\n'
                    '请到 Vercel Dashboard 配置以下环境变量：\n'
                    '• SMTP_HOST = smtp.aliyun.com\n'
                    '• SMTP_PORT = 465\n'
                    '• SMTP_SECURE = true\n'
                    '• SMTP_USER = 你的阿里云邮箱\n'
                    '• SMTP_PASS = 你的阿里云邮箱密码\n'
                    '• SMTP_FROM = 袋鼠君 <your@domain.com>\n\n'
                    '配置完成后点击 Redeploy 使其生效。'
                )
            })
        }

        send_url = 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id'
        req2 = urllib.request.Request(
            send_url,
            data=json.dumps(message).encode(),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {token}'
            },
            method='POST'
        )
        with urllib.request.urlopen(req2, timeout=10) as resp2:
            result = json.loads(resp2.read())
        if result.get('code') == 0:
            print('[Remind SMTP] 飞书提醒发送成功')
        else:
            print(f'[Remind SMTP] 飞书提醒发送失败: {result}')
    except Exception as e:
        print(f'[Remind SMTP] 发送飞书提醒异常: {e}')

def main():
    print('[Remind SMTP] 开始检查 SMTP 配置...')

    # 尝试从 .env.local 加载环境变量
    env_local = os.path.join(PROJECT_ROOT, '.env.local')
    if os.path.exists(env_local):
        print(f'[Remind SMTP] 从 {env_local} 加载环境变量')
        with open(env_local) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, value = line.partition('=')
                    os.environ.setdefault(key.strip(), value.strip())

    if check_smtp_configured():
        print('[Remind SMTP] SMTP 已配置 ✓ — 无需提醒')
    else:
        print('[Remind SMTP] SMTP 未配置 — 发送飞书提醒')
        send_feishu_reminder()

if __name__ == '__main__':
    main()
