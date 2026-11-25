'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime } from '@/lib/format';
import type { AdminClaim, AdminIntakeItem } from '@/types';

type Tab = 'claims' | 'intake';

function MatchBadge({ match }: { match: boolean | null }) {
  if (match === true) {
    return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Answer matches</span>;
  }
  if (match === false) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        Does not match. Check against the item.
      </span>
    );
  }
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
      No verification question set
    </span>
  );
}

export default function AdminDeskPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const isAdmin = user?.role === 'SECURITY_ADMIN';

  const [tab, setTab] = useState<Tab>('claims');
  const [claims, setClaims] = useState<AdminClaim[] | null>(null);
  const [intake, setIntake] = useState<AdminIntakeItem[] | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [activeCode, setActiveCode] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/login');
    else if (!isAdmin) router.replace('/');
  }, [loading, user, isAdmin, router]);

  const loadClaims = useCallback(async (code: string) => {
    try {
      const query = code ? `?code=${encodeURIComponent(code)}` : '';
      const data = await api<{ claims: AdminClaim[] }>(`/admin/claims${query}`);
      setClaims(data.claims);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load claims');
    }
  }, []);

  const loadIntake = useCallback(async () => {
    try {
      const data = await api<{ items: AdminIntakeItem[] }>('/admin/intake');
      setIntake(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load items');
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadClaims('');
    loadIntake();
  }, [isAdmin, loadClaims, loadIntake]);

  function searchCode(e: FormEvent) {
    e.preventDefault();
    const code = codeInput.trim().toUpperCase();
    setActiveCode(code);
    setNotice(null);
    loadClaims(code);
  }

  function clearSearch() {
    setCodeInput('');
    setActiveCode('');
    loadClaims('');
  }

  async function decide(claim: AdminClaim, decision: 'APPROVED' | 'REJECTED') {
    const message =
      decision === 'APPROVED'
        ? `Approve and hand over "${claim.item.title}" to ${claim.claimant.fullName}?\n\nConfirm you have checked their Student ID.`
        : `Reject the claim by ${claim.claimant.fullName}?`;
    if (!window.confirm(message)) return;

    setBusyId(claim.id);
    setError(null);
    setNotice(null);
    try {
      await api(`/admin/claims/${claim.id}/decision`, { method: 'POST', body: { decision } });
      setNotice(decision === 'APPROVED' ? 'Claim approved. Item marked as returned.' : 'Claim rejected.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusyId(null);
      await loadClaims(activeCode);
    }
  }

  async function receive(item: AdminIntakeItem) {
    if (!window.confirm(`Confirm "${item.title}" is physically at the desk?`)) return;

    setBusyId(item.id);
    setError(null);
    setNotice(null);
    try {
      await api(`/admin/items/${item.id}/intake`, { method: 'POST', body: {} });
      setNotice('Item received. It is now open for claims.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusyId(null);
      await loadIntake();
    }
  }

  if (loading || !isAdmin) {
    return <main className="mx-auto max-w-2xl px-4 py-10 text-gray-600">Loading…</main>;
  }

  const tabClass = (t: Tab) =>
    `rounded-lg py-2 text-sm font-medium ${tab === t ? 'bg-white shadow' : 'text-gray-600'}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Security desk</h1>

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-gray-200 p-1" role="group" aria-label="Desk sections">
        <button type="button" aria-pressed={tab === 'claims'} onClick={() => setTab('claims')} className={tabClass('claims')}>
          Pending claims{claims ? ` (${claims.length})` : ''}
        </button>
        <button type="button" aria-pressed={tab === 'intake'} onClick={() => setTab('intake')} className={tabClass('intake')}>
          Awaiting intake{intake ? ` (${intake.length})` : ''}
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}

      {tab === 'claims' && (
        <section>
          <form onSubmit={searchCode} className="mb-4 flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="Pickup code"
              aria-label="Pickup code"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-mono text-base uppercase tracking-widest outline-none focus:border-blue-600"
            />
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
              Find
            </button>
            {activeCode && (
              <button type="button" onClick={clearSearch} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm hover:bg-gray-50">
                Clear
              </button>
            )}
          </form>

          {!claims && !error && <p className="text-gray-600">Loading…</p>}
          {claims && claims.length === 0 && (
            <p className="py-8 text-center text-gray-500">
              {activeCode ? `No pending claim with code ${activeCode}.` : 'No pending claims.'}
            </p>
          )}

          <div className="space-y-4">
            {claims?.map((c) => {
              const own = c.claimant.email === user?.email;
              return (
                <article key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      {c.item.imageUrl && (
                        <img src={c.item.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.item.title}</p>
                        <p className="text-xs text-gray-500">
                          {c.item.category} · held at {c.item.custodyLocation ?? 'desk'}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-lg font-bold tracking-widest">{c.pickupCode}</span>
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Verification question</p>
                      <p>{c.item.secretPrompt ?? 'None set'}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Claimant&apos;s answer</p>
                      <p className="whitespace-pre-wrap">{c.proofAnswer}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <MatchBadge match={c.answerMatch} />
                  </div>

                  <p className="mt-3 text-sm">
                    <strong>{c.claimant.fullName}</strong> · {c.claimant.email}
                    {c.claimant.studentId ? ` · ID ${c.claimant.studentId}` : ''}
                  </p>
                  <p className="text-xs text-gray-500">Submitted {formatDateTime(c.createdAt)}</p>

                  {own ? (
                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      This is your own claim. Another admin must review it.
                    </p>
                  ) : (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => decide(c, 'REJECTED')}
                        disabled={busyId === c.id}
                        className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => decide(c, 'APPROVED')}
                        disabled={busyId === c.id}
                        className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        Approve handover
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'intake' && (
        <section>
          <p className="mb-4 text-sm text-gray-600">
            Found items reported online. Mark an item as received once it is physically at the desk,
            which opens it for claims.
          </p>

          {!intake && !error && <p className="text-gray-600">Loading…</p>}
          {intake && intake.length === 0 && (
            <p className="py-8 text-center text-gray-500">Nothing waiting for intake.</p>
          )}

          <div className="space-y-4">
            {intake?.map((item) => (
              <article key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex gap-3">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      {item.category} · found at {item.campusZone}
                    </p>
                    <p className="text-xs text-gray-500">
                      Hand-in point: {item.custodyLocation ?? 'not specified'}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-700">{item.description}</p>
                <p className="mt-2 text-xs text-gray-500">
                  Reported by {item.reporter.fullName} ({item.reporter.email}) ·{' '}
                  {formatDateTime(item.createdAt)}
                </p>
                <p className="text-xs text-gray-500">
                  Verification question: {item.secretPrompt ? 'set' : 'not set'}
                </p>
                <button
                  onClick={() => receive(item)}
                  disabled={busyId === item.id}
                  className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {busyId === item.id ? 'Saving…' : 'Mark as received'}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}