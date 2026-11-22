'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user, loading, logout } = useAuth();

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-4 text-2xl font-bold">Campus Lost &amp; Found</h1>
      {loading ? (
        <p className="text-gray-600">Loading…</p>
      ) : user ? (
        <div className="space-y-3">
          <p>
            Signed in as <strong>{user.fullName}</strong> ({user.email}) · {user.role}
          </p>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100"
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