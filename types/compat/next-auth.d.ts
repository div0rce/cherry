// reason: Cherry augments next-auth Session/User with user.id
// upstream: next-auth@5.0.0-beta.30
// audit: 2026-01-28
// removeWhen: Remove once next-auth exposes user.id or Cherry stops augmenting session types
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & {
      id: string;
    };
  }

  interface User {
    id: string;
  }
}
