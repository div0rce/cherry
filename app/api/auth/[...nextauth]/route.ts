import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '../../../../lib/prisma.js';

function hasNonEmptyString(value?: string | null): value is string {
  return value !== undefined && value !== null && value !== '';
}

function unwrapProvider(value: unknown): (...args: unknown[]) => unknown {
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
  return current as (...args: unknown[]) => unknown;
}

type ProviderFactory = (...args: unknown[]) => unknown;
const resolveEmailProvider = unwrapProvider(EmailProvider) as ProviderFactory;
const resolveGoogleProvider = unwrapProvider(GoogleProvider) as ProviderFactory;
const resolveCredentialsProvider = unwrapProvider(CredentialsProvider) as ProviderFactory;
const resolveNextAuth = unwrapProvider(NextAuth) as (options: unknown) => {
  handlers: { GET: (req: Request) => Promise<Response>; POST: (req: Request) => Promise<Response> };
  auth: () => Promise<{ user?: { id?: string; email?: string | null } } | null>;
};

const providers: unknown[] = [];
const emailServer = process.env['EMAIL_SERVER'] ?? null;
if (hasNonEmptyString(emailServer)) {
  providers.push(
    resolveEmailProvider({
      server: emailServer,
      from: process.env['EMAIL_FROM'] ?? 'no-reply@localhost',
    })
  );
}

const googleClientId = process.env['GOOGLE_CLIENT_ID'] ?? null;
const googleClientSecret = process.env['GOOGLE_CLIENT_SECRET'] ?? null;
if (hasNonEmptyString(googleClientId) && hasNonEmptyString(googleClientSecret)) {
  providers.push(
    resolveGoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  );
}

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
    })
  );
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  pages: {
    signIn: '/signin',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }: { session: { user?: { id?: string } }; token: { sub?: string } }) {
      if (
        session.user !== undefined &&
        session.user !== null &&
        hasNonEmptyString(token.sub)
      ) {
        // expose user id to the client + server helpers
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

export const { handlers, auth } = resolveNextAuth(authOptions);
export const { GET, POST } = handlers;
