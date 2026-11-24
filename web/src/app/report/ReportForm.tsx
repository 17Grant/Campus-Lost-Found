'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import ImageUploader from '@/components/ImageUploader';
import MatchResultsModal from '@/components/MatchResultsModal';
import type { CreateItemResponse, ItemMeta, ItemType } from '@/types';

function nowLocalInput(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200';

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

export default function ReportForm({ initialType }: { initialType: ItemType }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [meta, setMeta] = useState<ItemMeta | null>(null);
  const [type, setType] = useState<ItemType>(initialType);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [campusZone, setCampusZone] = useState('');
  const [custodyLocation, setCustodyLocation] = useState('');
  const [eventDate, setEventDate] = useState(nowLocalInput);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [secretPrompt, setSecretPrompt] = useState('');
  const [secretAnswer, setSecretAnswer] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateItemResponse | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api<ItemMeta>('/items/meta')
      .then(setMeta)
      .catch(() => setError('Could not load form options. Please refresh the page.'));
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const isFound = type === 'FOUND';
    const prompt = secretPrompt.trim();
    const answer = secretAnswer.trim();

    if (isFound && Boolean(prompt) !== Boolean(answer)) {
      setError('Provide both the verification question and its answer, or leave both empty.');
      return;
    }

    const body: Record<string, unknown> = {
      type,
      title: title.trim(),
      category,
      description: description.trim(),
      campusZone,
      eventDate: new Date(eventDate).toISOString(),
    };
    if (imageUrl) body.imageUrl = imageUrl;
    if (isFound) {
      body.custodyLocation = custodyLocation;
      if (prompt && answer) {
        body.secretPrompt = prompt;
        body.secretAnswer = answer;
      }
    }

    setSubmitting(true);
    try {
      setResult(await api<CreateItemResponse>('/items', { method: 'POST', body }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user || !meta) {
    return (
      <main className="mx-auto max-w-md px-4 py-10 text-gray-600">{error ?? 'Loading…'}</main>
    );
  }

  const isFound = type === 'FOUND';

  return (
    <>
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">Report an item</h1>

        <div
          className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-gray-200 p-1"
          role="group"
          aria-label="Report type"
        >
          {(['LOST', 'FOUND'] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className={`rounded-lg py-2 text-sm font-medium ${
                type === t ? 'bg-white shadow' : 'text-gray-600'
              }`}
            >
              {t === 'LOST' ? 'I lost something' : 'I found something'}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="What is it?" htmlFor="title">
            <input
              id="title"
              required
              minLength={3}
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Black Dell laptop charger"
              className={inputClass}
            />
          </Field>

          <Field label="Category" htmlFor="category">
            <select
              id="category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Select a category
              </option>
              {meta.categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            hint="Colour, brand, size, marks. More detail gives better matches."
          >
            <textarea
              id="description"
              required
              minLength={10}
              maxLength={1000}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label={isFound ? 'Where did you find it?' : 'Where did you lose it?'} htmlFor="zone">
            <select
              id="zone"
              required
              value={campusZone}
              onChange={(e) => setCampusZone(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Select a location
              </option>
              {meta.campusZones.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
          </Field>

          <Field label={isFound ? 'When did you find it?' : 'When did you lose it?'} htmlFor="date">
            <input
              id="date"
              type="datetime-local"
              required
              max={nowLocalInput()}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Photo">
            <ImageUploader
              value={imageUrl}
              onChange={setImageUrl}
              onUploadingChange={setUploading}
            />
          </Field>

          {isFound && (
            <>
              <Field
                label="Where did you hand it in?"
                htmlFor="custody"
                hint="Please hand found items to a desk rather than meeting the owner directly."
              >
                <select
                  id="custody"
                  required
                  value={custodyLocation}
                  onChange={(e) => setCustodyLocation(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a drop-off point
                  </option>
                  {meta.custodyLocations.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>

              <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-600">
                  <strong>Verification question (recommended).</strong> Ask something only the
                  owner would know. Keep the answer out of the description and photo.
                </p>
                <Field label="Question" htmlFor="prompt">
                  <input
                    id="prompt"
                    maxLength={200}
                    value={secretPrompt}
                    onChange={(e) => setSecretPrompt(e.target.value)}
                    placeholder="e.g. What sticker is on the back?"
                    className={inputClass}
                  />
                </Field>
                <Field label="Answer" htmlFor="answer">
                  <input
                    id="answer"
                    maxLength={100}
                    value={secretAnswer}
                    onChange={(e) => setSecretAnswer(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : uploading ? 'Uploading photo…' : 'Submit report'}
          </button>
        </form>
      </main>

      {result && (
        <MatchResultsModal
          item={result.item}
          matches={result.matches}
          onDone={() => router.push('/')}
        />
      )}
    </>
  );
}