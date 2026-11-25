'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { CLAIM_LABELS, STATUS_LABELS, formatDate } from '@/lib/format';
import type { ClaimSummary, ItemDetail, MyClaim } from '@/types';

function Notice({ tone, children }: { tone: 'info' | 'success' | 'warn'; children: ReactNode }) {
  const tones = {
    info: 'bg-blue-50 text-blue-900',
    success: 'bg-green-50 text-green-900',
    warn: 'bg-amber-50 text-amber-900',
  };
  return <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${tones[tone]}`}>{children}</div>;
}

export default function ItemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [claim, setClaim] = useState<ClaimSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

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
    api<{ claims: MyClaim[] }>('/claims/mine')
      .then((data) => setClaim(data.claims.find((c) => c.item.id === id) ?? null))
      .catch(() => {});
  }, [user, id]);

  async function submitClaim(e: FormEvent) {
    e.preventDefault();
    if (!item) return;
    if (!window.confirm('You only get one attempt for this item. Submit this answer?')) return;

    setSubmitting(true);
    setClaimError(null);
    try {
      const data = await api<{ claim: ClaimSummary }>('/claims', {
        method: 'POST',
        body: { itemId: item.id, proofAnswer: answer.trim() },
      });
      setClaim(data.claim);
      const fresh = await api<{ item: ItemDetail }>(`/items/${item.id}`).catch(() => null);
      if (fresh) setItem(fresh.item);
    } catch (err) {
      setClaimError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <p className="mb-4 text-gray-700">{error}</p>
        <Link href="/" className="text-blue-600 hover:underline">
          Back to browse
        </Link>
      </main>
    );
  }

  if (!item) {
    return <main className="mx-auto max-w-md px-4 py-10 text-gray-600">Loading…</main>;
  }

  const isLost = item.type === 'LOST';
  const holdingPlace = item.custodyLocation ?? 'the security desk';

  let panel: ReactNode = null;

  if (claim) {
    if (claim.status === 'PENDING') {
      panel = (
        <Notice tone="info">
          <p className="font-medium">Claim submitted. Waiting for desk review.</p>
          <p className="mt-1">
            Bring your Student ID and show this code at <strong>{holdingPlace}</strong>:
          </p>
          <p className="my-2 text-center font-mono text-3xl font-bold tracking-[0.3em]">
            {claim.pickupCode}
          </p>
        </Notice>
      );
    } else if (claim.status === 'APPROVED') {
      panel = <Notice tone="success">Your claim was approved. This item has been returned to you.</Notice>;
    } else {
      panel = (
        <Notice tone="warn">
          Your claim was {CLAIM_LABELS[claim.status].toLowerCase()}. If you believe this is a
          mistake, visit {holdingPlace}.
        </Notice>
      );
    }
  } else if (item.isMine) {
    panel = (
      <Notice tone="info">
        {isLost
          ? 'This is your lost report. Check the browse page for found items that match.'
          : item.status === 'OPEN'
            ? `This is your found report. Please hand the item in at ${holdingPlace}. It opens for claims once the desk confirms receipt.`
            : 'This is your found report. The item is at the security desk and can now be claimed by its owner.'}
      </Notice>
    );
  } else if (isLost) {
    panel = (
      <Notice tone="info">
        Found this item?{' '}
        <Link href="/report?type=found" className="font-medium underline">
          Report it as found
        </Link>{' '}
        and hand it in at a drop-off point.
      </Notice>
    );
  } else if (item.status === 'OPEN') {
    panel = (
      <Notice tone="warn">
        This item has not been received at the security desk yet. Claims open once it has.
      </Notice>
    );
  } else if (item.status === 'RESOLVED' || item.status === 'ARCHIVED') {
    panel = <Notice tone="info">This item is no longer available.</Notice>;
  } else {
    panel = (
      <form onSubmit={submitClaim} className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="font-semibold">Is this yours?</h2>
        <label htmlFor="proof" className="block text-sm font-medium">
          {item.secretPrompt ??
            'Describe something only the owner would know (marks, contents, serial number).'}
        </label>
        <textarea
          id="proof"
          required
          minLength={2}
          maxLength={500}
          rows={3}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
        />
        <p className="text-xs text-gray-500">
          You get one attempt per item. You will receive a pickup code to show at {holdingPlace}
          along with your Student ID.
        </p>
        {claimError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {claimError}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit claim'}
        </button>
      </form>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Link href="/" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← Back to browse
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

      {panel}
    </main>
  );
}