import Link from 'next/link';
import type { ItemSummary } from '@/types';
import { STATUS_LABELS, formatDate } from '@/lib/format';

interface Props {
  item: ItemSummary;
  similarity?: number;
}

export default function ItemCard({ item, similarity }: Props) {
  const isLost = item.type === 'LOST';

  return (
    <Link
      href={`/items/${item.id}`}
      className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:border-blue-400"
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.title}
          className="h-20 w-20 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
          No photo
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isLost ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {isLost ? 'Lost' : 'Found'}
          </span>
          <span className="text-xs text-gray-500">{STATUS_LABELS[item.status]}</span>
          {similarity !== undefined && (
            <span className="text-xs font-medium text-blue-700">
              {Math.round(similarity * 100)}% match
            </span>
          )}
        </div>
        <p className="truncate font-medium">{item.title}</p>
        <p className="truncate text-sm text-gray-600">
          {item.category} · {item.campusZone}
        </p>
        <p className="text-xs text-gray-500">{formatDate(item.eventDate)}</p>
      </div>
    </Link>
  );
}