export type Role = 'STUDENT' | 'STAFF' | 'SECURITY_ADMIN';
export type ItemType = 'LOST' | 'FOUND';
export type ItemStatus = 'OPEN' | 'AT_SECURITY_DESK' | 'CLAIM_PENDING' | 'RESOLVED' | 'ARCHIVED';

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