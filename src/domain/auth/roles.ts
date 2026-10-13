export const userRoles = ["student", "cataloger", "administrator"] as const;
export type UserRole = (typeof userRoles)[number];

const permissions = {
  student: ["read:own-profile", "read:own-protocols"],
  cataloger: ["read:queue", "manage:assigned-protocols", "read:controlled-terms"],
  administrator: [
    "read:queue",
    "manage:assigned-protocols",
    "read:controlled-terms",
    "manage:users",
    "manage:programs",
    "manage:announcements",
    "read:audit-logs",
  ],
} as const satisfies Record<UserRole, readonly string[]>;

export type Permission = (typeof permissions)[UserRole][number];

export function hasPermission(role: UserRole, permission: Permission) {
  return (permissions[role] as readonly string[]).includes(permission);
}
