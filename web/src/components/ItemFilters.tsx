'use client';

import type { ItemMeta, ItemType } from '@/types';

export interface Filters {
  q: string;
  type: '' | ItemType;
  category: string;
  campusZone: string;
}

export const EMPTY_FILTERS: Filters = { q: '', type: '', category: '', campusZone: '' };

interface Props {
  filters: Filters;
  meta: ItemMeta | null;
  onChange: (filters: Filters) => void;
}

const selectClass =
  'w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm outline-none focus:border-blue-600';

export default function ItemFilters({ filters, meta, onChange }: Props) {
  const active = Boolean(filters.q || filters.type || filters.category || filters.campusZone);
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="space-y-2">
      <input
        type="search"
        value={filters.q}
        onChange={(e) => set({ q: e.target.value })}
        placeholder="Search items, e.g. charger"
        aria-label="Search items"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
      />
      <div className="grid grid-cols-3 gap-2">
        <select
          aria-label="Type"
          value={filters.type}
          onChange={(e) => set({ type: e.target.value as Filters['type'] })}
          className={selectClass}
        >
          <option value="">All types</option>
          <option value="LOST">Lost</option>
          <option value="FOUND">Found</option>
        </select>
        <select
          aria-label="Category"
          value={filters.category}
          onChange={(e) => set({ category: e.target.value })}
          className={selectClass}
        >
          <option value="">All categories</option>
          {meta?.categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Location"
          value={filters.campusZone}
          onChange={(e) => set({ campusZone: e.target.value })}
          className={selectClass}
        >
          <option value="">All locations</option>
          {meta?.campusZones.map((z) => (
            <option key={z}>{z}</option>
          ))}
        </select>
      </div>
      {active && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="text-sm text-blue-600 hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}