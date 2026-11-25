'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import ItemCard from '@/components/ItemCard';
import ItemFilters, { EMPTY_FILTERS, type Filters } from '@/components/ItemFilters';
import type { ItemListResponse, ItemMeta, ItemSummary } from '@/types';

export default function HomePage() {
  const { user, loading } = useAuth();

  const [meta, setMeta] = useState<ItemMeta | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState('');
  const [items, setItems] = useState<ItemSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q.trim()), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  useEffect(() => {
    if (!user) return;
    api<ItemMeta>('/items/meta')
      .then(setMeta)
      .catch(() => {});
  }, [user]);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      const id = ++requestId.current;
      setFetching(true);
      setError(null);

      const params = new URLSearchParams({ page: String(nextPage), limit: '20' });
      if (debouncedQ) params.set('q', debouncedQ);
      if (filters.type) params.set('type', filters.type);
      if (filters.category) params.set('category', filters.category);
      if (filters.campusZone) params.set('campusZone', filters.campusZone);

      try {
        const data = await api<ItemListResponse>(`/items?${params}`);
        if (id !== requestId.current) return; // a newer request superseded this one
        setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
        setPage(data.page);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } catch {
        if (id !== requestId.current) return;
        setError('Could not load items. Please try again.');
      } finally {
        if (id === requestId.current) setFetching(false);
      }
    },
    [debouncedQ, filters.type, filters.category, filters.campusZone],
  );

  useEffect(() => {
    if (user) load(1, true);
  }, [user, load]);

  if (loading) {
    return <main className="mx-auto max-w-2xl px-4 py-10 text-gray-600">Loading…</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold">Campus Lost &amp; Found</h1>
        <p className="mb-6 text-gray-600">
          Report lost items, see what has been handed in, and claim yours safely.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          Sign in with your campus email
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Link
          href="/report?type=lost"
          className="rounded-xl bg-red-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-red-700"
        >
          I lost something
        </Link>
        <Link
          href="/report?type=found"
          className="rounded-xl bg-green-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-green-700"
        >
          I found something
        </Link>
      </div>

      <ItemFilters filters={filters} meta={meta} onChange={setFilters} />

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <p className="mb-2 mt-4 text-sm text-gray-500">
        {fetching && items.length === 0 ? 'Loading…' : `${total} ${total === 1 ? 'item' : 'items'}`}
      </p>

      <div className="space-y-2">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>

      {!fetching && items.length === 0 && !error && (
        <p className="py-10 text-center text-gray-500">No items match your search.</p>
      )}

      {page < totalPages && (
        <button
          onClick={() => load(page + 1, false)}
          disabled={fetching}
          className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
        >
          {fetching ? 'Loading…' : 'Load more'}
        </button>
      )}
    </main>
  );
}