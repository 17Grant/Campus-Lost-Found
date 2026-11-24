'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { STATUS_LABELS, formatDate } from '@/lib/format';
import type { ItemDetail } from '@/types';

export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api<{ item: ItemDetail }>(`/items/${id}`)
      .then((data) => setItem(data.item))
      .catch((err) =>
        setError(
          err instanceof ApiError && err.status === 404
            ? 'This item could not be found.'
            : 'Could not load this item.',
        ),
      );
  }, [user, id]);

  if (error) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <p className="mb-4 text-gray-700">{error}</p>
        <Link href="/" className="text-blue-600 hover:underline">
          Back to home
        </Link>
      </main>
    );
  }

  if (!item) {
    return <main className="mx-auto max-w-md px-4 py-10 text-gray-600">Loading…</main>;
  }

  const isLost = item.type === 'LOST';

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link href="/" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← Home
      </Link>

      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.title}
          className="mb-4 max-h-80 w-full rounded-xl object-cover"
        />
      )}

      <div className="mb-2 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isLost ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {isLost ? 'Lost' : 'Found'}
        </span>
        <span className="text-sm text-gray-500">{STATUS_LABELS[item.status]}</span>
        {item.isMine && <span className="text-sm text-gray-500">· Your report</span>}
      </div>

      <h1 className="mb-3 text-2xl font-bold">{item.title}</h1>
      <p className="mb-4 whitespace-pre-wrap text-gray-800">{item.description}</p>

      <dl className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Category</dt>
          <dd>{item.category}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">{isLost ? 'Lost at' : 'Found at'}</dt>
          <dd>{item.campusZone}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-gray-500">Date</dt>
          <dd>{formatDate(item.eventDate)}</dd>
        </div>
        {item.custodyLocation && (
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Held at</dt>
            <dd>{item.custodyLocation}</dd>
          </div>
        )}
      </dl>
    </main>
  );
}