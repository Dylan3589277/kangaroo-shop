import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

// 扩展 User 类型以包含 role
declare module 'next-auth' {
  interface User {
    role?: string;
  }
  interface Session {
    user: {
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
  }
}

const WEAK_DEFAULT_ADMIN_PASSWORDS = new Set([
  'changeme',
  'changeme123',
  'password',
  'admin',
  '123456',
]);

function isProduction() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

function isWeakDefaultAdminPassword(password: string | undefined) {
  if (!password || password.startsWith('$2')) return false;
  return WEAK_DEFAULT_ADMIN_PASSWORDS.has(password.trim().toLowerCase());
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Admin Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Admin credentials from environment variables
        const adminEmail = process.env.ADMIN_EMAIL;
        // ADMIN_PASSWORD can be a bcrypt hash (starts with $2) or plain text for migration
        const adminPassword = process.env.ADMIN_PASSWORD;

        // Verify email first
        if (credentials.email !== adminEmail) {
          return null;
        }

        if (isProduction() && isWeakDefaultAdminPassword(adminPassword)) {
          console.error('SECURITY: Refusing admin login because ADMIN_PASSWORD is a weak default value in production.');
          throw new Error('UnsafeAdminPassword');
        }

        // Verify password using bcrypt if it's a hash, otherwise plain text compare
        let passwordValid = false;
        if (adminPassword?.startsWith('$2')) {
          // It's a bcrypt hash
          passwordValid = await bcrypt.compare(credentials.password, adminPassword);
        } else {
          // Plain text fallback (for migration)
          passwordValid = credentials.password === adminPassword;
        }

        if (!passwordValid) {
          return null;
        }

        return {
          id: '1',
          email: adminEmail,
          name: 'Admin',
          role: 'admin',
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
