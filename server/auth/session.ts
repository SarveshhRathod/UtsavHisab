import { PrismaClient, Role } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export interface AuthenticatedContext {
  userId: string;
  userEmail: string;
  mandalId: string;
  role: Role;
}

export const RolePermissions: Record<Role, string[]> = {
  SUPER_ADMIN: ['*'],
  MANDAL_ADMIN: ['*'],
  PRESIDENT: [
    'mandal.view', 'mandal.edit', 'member.view', 'member.invite', 'member.approve',
    'income.view', 'income.create', 'income.edit', 'expense.view', 'expense.create',
    'expense.approve', 'donor.view', 'donor.create', 'report.view', 'report.export', 'settings.manage'
  ],
  TREASURER: [
    'income.view', 'income.create', 'income.edit', 'expense.view', 'expense.create',
    'expense.approve', 'accounts.transfer', 'accounts.reconcile', 'report.view', 'report.export'
  ],
  SECRETARY: [
    'mandal.view', 'member.view', 'member.invite', 'income.view', 'income.create',
    'expense.view', 'expense.create', 'report.view'
  ],
  COLLECTOR: [
    'income.create', 'income.view.self', 'receipts.issue', 'donor.create', 'doorToDoor.update'
  ],
  VOLUNTEER: [
    'income.create', 'receipts.issue'
  ],
  VIEWER: [
    'income.view', 'expense.view', 'report.view'
  ]
};

export async function resolveRequestContext(
  req: NextRequest,
  requiredPermission?: string
): Promise<{ context?: AuthenticatedContext; errorResponse?: NextResponse }> {
  // 1. Session token derivation (mock header or real NextAuth token)
  const sessionUserEmail = req.headers.get('x-user-email') || 'rahul.admin@utsavhisab.com';
  const requestedMandalId = req.headers.get('x-mandal-id') || req.nextUrl.searchParams.get('mandalId');

  const user = await prisma.user.findUnique({
    where: { email: sessionUserEmail },
    include: { memberships: true }
  });

  if (!user) {
    return {
      errorResponse: NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 })
    };
  }

  // Derive target mandal
  const targetMandalId = requestedMandalId || user.memberships[0]?.mandalId;
  const membership = user.memberships.find(m => m.mandalId === targetMandalId && m.isActive);

  if (!membership && !user.isSuperAdmin) {
    return {
      errorResponse: NextResponse.json({ success: false, error: { code: 'FORBIDDEN_TENANT', message: 'No active access to requested Mandal' } }, { status: 403 })
    };
  }

  const role = user.isSuperAdmin ? Role.SUPER_ADMIN : membership!.role;

  // 2. Permission Check
  if (requiredPermission) {
    const granted = RolePermissions[role] || [];
    if (!granted.includes('*') && !granted.includes(requiredPermission)) {
      return {
        errorResponse: NextResponse.json({ success: false, error: { code: 'FORBIDDEN_ROLE', message: `Missing required permission: ${requiredPermission}` } }, { status: 403 })
      };
    }
  }

  return {
    context: {
      userId: user.id,
      userEmail: user.email,
      mandalId: targetMandalId,
      role
    }
  };
}
