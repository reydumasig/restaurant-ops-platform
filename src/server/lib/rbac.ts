export const ROLE_KEYS = ["owner", "admin", "commissary_staff", "branch_manager", "branch_staff"] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

/** Roles with implicit access to every branch and the commissary. */
export const HQ_ROLE_KEYS: readonly RoleKey[] = ["owner", "admin"];

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  roleKey: RoleKey;
  branchId: string | null;
};

export function isHqScoped(user: AuthUser): boolean {
  return HQ_ROLE_KEYS.includes(user.roleKey);
}

/** Throws-free check: can this user act on data belonging to `branchId`? */
export function canAccessBranch(user: AuthUser, branchId: string): boolean {
  return isHqScoped(user) || user.branchId === branchId;
}
