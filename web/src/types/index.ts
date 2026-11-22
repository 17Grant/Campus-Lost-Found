export type Role = 'STUDENT' | 'STAFF' | 'SECURITY_ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  studentId?: string | null;
}