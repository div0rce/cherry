import NextAuth, { NextAuthOptions } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

type AuthProvider = NextAuthOptions['providers'][number];

const providers: AuthProvider[] = [
  EmailProvider({
    server: process.env.EMAIL_SERVER ?? '',
    from: process.env.EMAIL_FROM ?? 'no-reply@localhost',
  }),
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
];

if (process.env.NODE_ENV !== 'production') {
  providers.push(
    CredentialsProvider({
      name: 'Dev Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        const email = credentials.email.toLowerCase().trim();

        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
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
      if (session.user && token.sub) {
        // expose user id to the client + server helpers
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
