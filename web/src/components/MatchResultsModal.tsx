'use client';

import Link from 'next/link';
import ItemCard from '@/components/ItemCard';
import type { Item, ItemMatch } from '@/types';

interface Props {
  item: Item;
  matches: ItemMatch[];
  onDone: () => void;
}

export default function MatchResultsModal({ item, matches, onDone }: Props) {
  const isLost = item.type === 'LOST';

  let message: string;
  if (matches.length > 0) {
    message = isLost
      ? 'These found items look similar to yours. Open one to see details.'
      : 'These lost reports look similar to what you found. Open one to see details.';
  } else {
    message = isLost
      ? 'No similar found items yet. Your report is listed so a match can be found later.'
      : 'No matching lost reports yet. Your item is listed so its owner can find it.';
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <h2 id="match-title" className="text-lg font-bold">
          Report submitted
        </h2>
        <p className="mt-1 text-sm text-gray-600">{message}</p>

        {!isLost && item.custodyLocation && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            If you haven&apos;t already, please hand the item in at{' '}
            <strong>{item.custodyLocation}</strong>.
          </p>
        )}

        {matches.length > 0 && (
          <div className="mt-4 space-y-2">
            {matches.map((m) => (
              <ItemCard key={m.id} item={m} similarity={m.similarity} />
            ))}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <Link
            href={`/items/${item.id}`}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-center text-sm font-medium hover:bg-gray-50"
          >
            View my report
          </Link>
          <button
            type="button"
            onClick={onDone}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}