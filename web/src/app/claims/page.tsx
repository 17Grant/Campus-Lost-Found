'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { CLAIM_LABELS, STATUS_LABELS, formatDateTime } from '@/lib/format';
import type { ClaimStatus, MyClaim } from '@/types';

const BADGE: Record<ClaimStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function MyClaimsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [claims, setClaims] = useState<MyClaim[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api<{ claims: MyClaim[] }>('/claims/mine')
      .then((data) => setClaims(data.claims))
      .catch(() => setError('Could not load your claims.'));
  }, [user]);

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">My claims</h1>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {!claims && !error && <p className="text-gray-600">Loading…</p>}

      {claims && claims.length === 0 && (
        <p className="text-gray-600">
          You have not claimed anything yet.{' '}
          <Link href="/" className="text-blue-600 hover:underline">
            Browse found items
          </Link>
        </p>
      )}

      <div className="space-y-3">
        {claims?.map((c) => (
          <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[c.status]}`}>
                {CLAIM_LABELS[c.status]}
              </span>
              <span className="text-xs text-gray-500">{formatDateTime(c.createdAt)}</span>
            </div>
            <Link href={`/items/${c.item.id}`} className="font-medium hover:underline">
              {c.item.title}
            </Link>
            <p className="text-sm text-gray-500">Item status: {STATUS_LABELS[c.item.status]}</p>

            {c.status === 'PENDING' && c.pickupCode && (
              <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-center">
                <p className="text-xs text-blue-900">
                  Show this code and your Student ID at {c.item.custodyLocation ?? 'the security desk'}
                </p>
                <p className="font-mono text-2xl font-bold tracking-[0.3em]">{c.pickupCode}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}