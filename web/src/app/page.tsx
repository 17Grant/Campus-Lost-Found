'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user, loading, logout } = useAuth();

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Campus Lost &amp; Found</h1>

      {loading ? (
        <p className="text-gray-600">Loading…</p>
      ) : user ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Signed in as <strong>{user.fullName}</strong> · {user.role}
          </p>
          <Link
            href="/report?type=lost"
            className="block rounded-xl bg-red-600 px-4 py-4 text-center font-medium text-white hover:bg-red-700"
          >
            I lost something
          </Link>
          <Link
            href="/report?type=found"
            className="block rounded-xl bg-green-600 px-4 py-4 text-center font-medium text-white hover:bg-green-700"
          >
            I found something
          </Link>
          <button
            onClick={logout}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
          >
            Log out
          </button>
        </div>
      ) : (
        <Link
          href="/login"
          className="inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Sign in
        </Link>
      )}
    </main>
  );
}