'use client';

import type { JSX } from 'react';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { hasText } from '@/lib/text';
import { logGuardrailEvent } from '@/lib/log';

type SignInCardProps = {
  errorCode?: string;
  callbackUrl?: string;
};

const errorMessages: Record<string, string> = {
  CredentialsSignin: 'Invalid email or password. Please try again.',
  OAuthAccountNotLinked: 'This email is already linked with another sign-in method.',
};

export function SignInCard({
  errorCode,
  callbackUrl = '/cards',
}: SignInCardProps): JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const error = hasText(errorCode)
    ? errorMessages[errorCode] ?? 'Something went wrong while signing you in.'
    : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    const emailTrimmed = email.trim();
    const passwordTrimmed = password.trim();
    if (!hasText(emailTrimmed) || !hasText(passwordTrimmed)) {
      setStatus('Email and password are required.');
      logGuardrailEvent({
        userId: null,
        surface: 'signin',
        outcome: 'BLOCK',
        reason: 'MISSING_CREDENTIALS',
      });
      return;
    }

    setSubmitting(true);
    const result = await signIn('credentials', {
      redirect: true,
      email,
      password,
      callbackUrl,
    });

    if (hasText(result?.error)) {
      logGuardrailEvent({
        userId: null,
        surface: 'signin',
        outcome: 'BLOCK',
        reason: `AUTH_${result.error}`,
      });
      setStatus(errorMessages[result.error] ?? 'Invalid email or password. Please try again.');
      setSubmitting(false);
      return;
    }
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-6 shadow-2xl backdrop-blur">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-pink-200">Welcome back</p>
        <h2 className="text-2xl font-semibold text-white">Sign in to Cherry</h2>
        <p className="text-sm text-slate-300">Continue to your cards and buckets.</p>
      </div>

      {(hasText(error) || hasText(status)) && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-900/30 px-3 py-2 text-sm text-red-100">
          {hasText(error) ? error : status}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-pink-500 focus:outline-none"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-200">Password</label>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-xs text-pink-200 hover:text-pink-100"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-pink-500 focus:outline-none"
            placeholder="••••••••"
            required
          />
          <div className="text-xs text-slate-400">
            <Link href="/forgot-password" className="text-pink-200 hover:text-pink-100">
              Forgot your password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-pink-600 px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="mt-4 space-y-3">
        <SocialButtons callbackUrl={callbackUrl} />
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Don’t have an account?</span>
          <Link href="/signup" className="text-pink-200 hover:text-pink-100">
            Create one
          </Link>
        </div>
        <p className="text-[11px] text-slate-500">
          By continuing you agree to the Cherry Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function SocialButtons({ callbackUrl }: { callbackUrl: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
          or continue with
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>
      <button
        type="button"
        onClick={() => signIn('google', { callbackUrl })}
        className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-pink-400 hover:text-white transition"
      >
        Continue with Google
      </button>
    </div>
  );
}
