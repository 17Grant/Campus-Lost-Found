'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Navbar() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  const linkClass = 'text-gray-700 hover:text-blue-600';

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
        <Link href="/" className="font-bold">
          Lost &amp; Found
        </Link>
        {!loading && user && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <Link href="/report" className={linkClass}>
              Report
            </Link>
            <Link href="/claims" className={linkClass}>
              My claims
            </Link>
            {user.role === 'SECURITY_ADMIN' && (
              <Link href="/admin/desk" className={linkClass}>
                Desk
              </Link>
            )}
            <button onClick={handleLogout} className="text-gray-500 hover:text-gray-800">
              Log out
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}