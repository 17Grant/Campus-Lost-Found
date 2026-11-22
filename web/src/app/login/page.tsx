'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';

const DOMAIN_HINT = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN ?? '';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  async function requestCode(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await api('/auth/request-otp', { method: 'POST', body: { email: normalizedEmail } });
      setStep('code');
      setInfo('Code sent. Check your campus email.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const name = fullName.trim();
      await api<{ user: User }>('/auth/verify-otp', {
        method: 'POST',
        body: { email: normalizedEmail, code, ...(name ? { fullName: name } : {}) },
      });
      await refresh();
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200';
  const buttonClass =
    'w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">Campus Lost &amp; Found</h1>
      <p className="mb-6 text-sm text-gray-600">Sign in with your campus email.</p>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {info && (
        <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{info}</p>
      )}

      {step === 'email' ? (
        <form onSubmit={requestCode} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Campus email
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`you${DOMAIN_HINT}`}
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={busy} className={buttonClass}>
            {busy ? 'Sending…' : 'Send code'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter the 6-digit code sent to <strong>{normalizedEmail}</strong>.
          </p>
          <div>
            <label htmlFor="code" className="mb-1 block text-sm font-medium">
              Code
            </label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className={`${inputClass} tracking-[0.4em]`}
            />
          </div>
          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium">
              Full name <span className="font-normal text-gray-500">(first time only)</span>
            </label>
            <input
              id="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={busy || code.length !== 6} className={buttonClass}>
            {busy ? 'Verifying…' : 'Sign in'}
          </button>
          <div className="flex justify-between text-sm">
            <button
              type="button"
              disabled={busy}
              onClick={() => requestCode()}
              className="text-blue-600 hover:underline disabled:opacity-60"
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setCode('');
                setError(null);
                setInfo(null);
              }}
              className="text-gray-600 hover:underline"
            >
              Use a different email
            </button>
          </div>
        </form>
      )}
    </main>
  );
}