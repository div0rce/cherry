import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '../../../../lib/prisma';

type AuthProvider = NextAuthOptions['providers'][number];

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

function unwrapProvider<T extends (...args: never[]) => unknown>(value: unknown): T {
  let current = value;
  for (let i = 0; i < 2; i += 1) {
    if (typeof current === 'object' && current !== null && 'default' in current) {
      current = (current as { default: unknown }).default;
      continue;
    }
    break;
  }
  if (typeof current !== 'function') {
    throw new Error('Auth provider import is not callable');
  }
  return current as T;
}

const resolveEmailProvider = unwrapProvider<typeof EmailProvider>(EmailProvider);
const resolveGoogleProvider = unwrapProvider<typeof GoogleProvider>(GoogleProvider);
const resolveCredentialsProvider = unwrapProvider<typeof CredentialsProvider>(CredentialsProvider);
const resolveNextAuth = unwrapProvider<(options: NextAuthOptions) => unknown>(NextAuth);

const providers: AuthProvider[] = [
  resolveEmailProvider({
    server: process.env['EMAIL_SERVER'] ?? '',
    from: process.env['EMAIL_FROM'] ?? 'no-reply@localhost',
  }),
  resolveGoogleProvider({
    clientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
    clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
  }),
];

if (process.env.NODE_ENV !== 'production') {
  providers.push(
    resolveCredentialsProvider({
      name: 'Dev Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: Record<string, string> | undefined) {
        const emailInput = credentials?.['email'] ?? null;
        if (!hasNonEmptyString(emailInput)) {
          return null;
        }

        const email = emailInput.toLowerCase().trim();

        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser !== null) {
          return { id: existingUser.id, email: existingUser.email };
        }

        const newUser = await prisma.user.create({
          data: {
            email,
          },
        });

        return { id: newUser.id, email: newUser.email };
      },
    }) as AuthProvider
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  pages: {
    signIn: '/signin',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }) {
      if (
        session.user !== undefined &&
        session.user !== null &&
        hasNonEmptyString(token.sub)
      ) {
        // expose user id to the client + server helpers
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
};

const handler = resolveNextAuth(authOptions) as (req: Request) => Promise<Response>;
export { handler as GET, handler as POST };
