export type Role = 'STUDENT' | 'STAFF' | 'SECURITY_ADMIN';
export type ItemType = 'LOST' | 'FOUND';
export type ItemStatus = 'OPEN' | 'AT_SECURITY_DESK' | 'CLAIM_PENDING' | 'RESOLVED' | 'ARCHIVED';
export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  studentId?: string | null;
}

export interface ItemSummary {
  id: string;
  type: ItemType;
  status: ItemStatus;
  title: string;
  category: string;
  description: string;
  campusZone: string;
  custodyLocation: string | null;
  imageUrl: string | null;
  eventDate: string;
}

export interface Item extends ItemSummary {
  createdAt: string;
}

export interface ItemMatch extends ItemSummary {
  similarity: number;
}

export interface ItemDetail extends Item {
  secretPrompt: string | null;
  isMine: boolean;
}

export interface ItemMeta {
  categories: string[];
  campusZones: string[];
  custodyLocations: string[];
}

export interface CreateItemResponse {
  item: Item;
  matches: ItemMatch[];
}

export interface ItemListResponse {
  items: ItemSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ClaimSummary {
  id: string;
  status: ClaimStatus;
  pickupCode: string | null;
  createdAt: string;
}

export interface MyClaim extends ClaimSummary {
  reviewedAt: string | null;
  item: {
    id: string;
    title: string;
    imageUrl: string | null;
    custodyLocation: string | null;
    status: ItemStatus;
  };
}

export interface AdminClaim {
  id: string;
  proofAnswer: string;
  answerMatch: boolean | null;
  pickupCode: string | null;
  createdAt: string;
  item: {
    id: string;
    title: string;
    category: string;
    description: string;
    imageUrl: string | null;
    custodyLocation: string | null;
    secretPrompt: string | null;
  };
  claimant: { fullName: string; email: string; studentId: string | null };
}

export interface AdminIntakeItem {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string | null;
  campusZone: string;
  custodyLocation: string | null;
  eventDate: string;
  createdAt: string;
  secretPrompt: string | null;
  reporter: { fullName: string; email: string };
}