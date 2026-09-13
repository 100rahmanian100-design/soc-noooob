/** انواع مشترک فرانت — هم‌راستا با api/_lib/core.ts */

export type Role = 'superadmin' | 'admin' | 'user';

export interface PublicAccount {
  username: string;
  role: Role;
  createdBy: string | null;
  active: boolean;
  createdAt: string;
}

export interface CommentItem {
  id: string;
  phase: string;
  author: string;
  authorRole: Role;
  targetAdmin: string | null;
  parentId: string | null;
  text: string;
  createdAt: string;
  answered: boolean;
}

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: 'سوپر ادمین',
  admin: 'ادمین',
  user: 'کاربر',
};
