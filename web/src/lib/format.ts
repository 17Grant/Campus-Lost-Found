import type { ItemStatus } from '@/types';

export const STATUS_LABELS: Record<ItemStatus, string> = {
  OPEN: 'Open',
  AT_SECURITY_DESK: 'At security desk',
  CLAIM_PENDING: 'Claim pending',
  RESOLVED: 'Returned',
  ARCHIVED: 'Archived',
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}