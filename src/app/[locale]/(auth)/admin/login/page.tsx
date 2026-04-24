'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import styles from './page.module.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'zh';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const labels = {
    zh: { title: '管理员登录', email: '邮箱', password: '密码', button: '登录', loading: '登录中...' },
    ja: { title: '管理者ログイン', email: 'メールアドレス', password: 'パスワード', button: 'ログイン', loading: 'ログイン中...' },
    en: { title: 'Admin Login', email: 'Email', password: 'Password', button: 'Sign In', loading: 'Signing in...' },
  };
  const t = labels[locale as keyof typeof labels] || labels.zh;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(locale === 'ja' ? 'メールアドレスまたはパスワードが正しくありません' : locale === 'en' ? 'Invalid email or password' : '邮箱或密码错误');
      return;
    }

    router.push(`/${locale}/admin`);
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>{t.title}</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">{t.email}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">{t.password}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? t.loading : t.button}
          </button>
        </form>
      </div>
    </div>
  );
}
