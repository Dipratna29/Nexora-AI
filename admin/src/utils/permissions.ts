import { AdminRole } from '../types';

export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  SUPER_ADMIN: ['*'],
  ADMIN: [
    'users:read', 'users:write', 'inventory:read', 'inventory:write',
    'complaints:read', 'complaints:write', 'sos:read', 'sos:write',
    'notifications:read', 'notifications:write', 'guides:read', 'guides:write',
    'facilities:read', 'facilities:write', 'offers:read', 'offers:write',
    'pricing:read', 'pricing:write', 'payments:read', 'audit:read',
    'settings:read', 'settings:write'
  ],
  MODERATOR: [
    'users:read', 'complaints:read', 'complaints:write',
    'guides:read', 'facilities:read', 'offers:read', 'pricing:read'
  ],
  INVENTORY_MANAGER: [
    'inventory:read', 'inventory:write', 'pricing:read', 'pricing:write'
  ],
  SUPPORT_MANAGER: [
    'users:read', 'complaints:read', 'complaints:write', 'sos:read', 'sos:write',
    'notifications:read', 'notifications:write'
  ]
};

export const hasPermission = (userRole: AdminRole | undefined, permission: string): boolean => {
  if (!userRole) return false;
  const perms = ROLE_PERMISSIONS[userRole] || [];
  return perms.includes('*') || perms.includes(permission);
};

export const canViewLocation = (userRole: AdminRole | undefined): boolean => {
  if (!userRole) return false;
  return ['SUPER_ADMIN', 'ADMIN', 'SUPPORT_MANAGER'].includes(userRole);
};
