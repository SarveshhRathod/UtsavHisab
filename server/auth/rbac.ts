import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';

export const RolePermissions: Record<Role, string[]> = {
  SUPER_ADMIN: ['*'],
  MANDAL_ADMIN: ['*'],
  PRESIDENT: [
    'income.create', 'income.view', 'income.edit',
    'expense.create', 'expense.view', 'expense.approve',
    'members.invite', 'members.view', 'reports.view', 'reports.export', 'settings.manage'
  ],
  TREASURER: [
    'income.create', 'income.view', 'income.edit',
    'expense.create', 'expense.view', 'expense.approve',
    'reports.view', 'reports.export', 'accounts.transfer'
  ],
  SECRETARY: [
    'income.create', 'income.view', 'expense.create', 'expense.view',
    'members.invite', 'members.view', 'reports.view'
  ],
  COLLECTOR: [
    'income.create', 'income.view.self', 'receipts.issue', 'donors.create'
  ],
  VOLUNTEER: [
    'income.create', 'receipts.issue'
  ],
  VIEWER: [
    'income.view', 'expense.view', 'reports.view'
  ]
};

export function hasPermission(userRole: Role, permission: string): boolean {
  const perms = RolePermissions[userRole] || [];
  if (perms.includes('*')) return true;
  return perms.includes(permission);
}

export function enforceTenantAndRole(userRole: Role, requiredPermission: string) {
  if (!hasPermission(userRole, requiredPermission)) {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'You lack permission to perform this action.' } },
      { status: 403 }
    );
  }
  return null;
}
