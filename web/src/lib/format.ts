import type { ClaimStatus, ItemStatus } from '@/types';

export const STATUS_LABELS: Record<ItemStatus, string> = {
  OPEN: 'Open',
  AT_SECURITY_DESK: 'At security desk',
  CLAIM_PENDING: 'Claim pending',
  RESOLVED: 'Returned',
  ARCHIVED: 'Archived',
};

export const CLAIM_LABELS: Record<ClaimStatus, string> = {
  PENDING: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Not approved',
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}