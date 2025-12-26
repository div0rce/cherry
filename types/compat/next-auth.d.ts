/**
 * COMPATIBILITY SHIM
 * Reason: Cherry augments next-auth Session/User with user.id.
 * Scope: next-auth
 * Audit: review on next-auth upgrade.
 */
import { DefaultSession } from 'next-auth';

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
