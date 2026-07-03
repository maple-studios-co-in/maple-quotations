// Permission model: tool access (`tool:<name>`) + key actions (`act:<action>`).
// A role's `permissions` array holds these keys; `*` means everything (admin).

export const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator", sales: "Sales", accounts: "Accounts", hr: "HR",
};

export const ACTIONS = ["delete", "export", "publish", "manage_users", "manage_roles", "manage_flags"] as const;
export type ActionKey = (typeof ACTIONS)[number];
export const ACTION_LABEL: Record<ActionKey, string> = {
  delete: "Delete records", export: "Export data", publish: "Publish (catalog/photoshoot)",
  manage_users: "Manage users", manage_roles: "Manage roles", manage_flags: "Manage feature flags",
};

export const toolPerm = (tool: string) => `tool:${tool}`;
export const actionPerm = (a: string) => `act:${a}`;

// Legacy role→tool map, used only as a fallback for sessions issued before perms existed.
const LEGACY: Record<string, string[]> = {
  "/leads": ["admin","sales"], "/crm": ["admin","sales","accounts"], "/quotations": ["admin","sales"],
  "/orders": ["admin","sales"], "/invoices": ["admin","sales","accounts"], "/payments": ["admin","accounts"],
  "/catalog": ["admin","sales"], "/photoshoot": ["admin","sales"], "/price-list": ["admin","sales"],
  "/inventory": ["admin","accounts","sales"], "/finance": ["admin","accounts"], "/hr": ["admin","hr"],
  "/purchase-orders": ["admin","accounts"], "/challans": ["admin","sales"], "/expenses": ["admin","accounts"],
  "/users": ["admin"], "/tasks": ["admin","sales","accounts","hr"],
};
function legacyCanAccess(role: string, tool: string): boolean {
  if (role === "admin") return true;
  const e = LEGACY["/" + tool];
  return e ? e.includes(role) : true;
}

/** Can this set of permissions open <tool>? Falls back to the legacy role map for
 *  pre-permission sessions (empty perms). */
export function canAccessTool(perms: string[] | undefined, tool: string, legacyRole?: string): boolean {
  if (!perms || perms.length === 0) return legacyRole ? legacyCanAccess(legacyRole, tool) : false;
  return perms.includes("*") || perms.includes(toolPerm(tool));
}

/** Can this set of permissions perform <action>? */
export function can(perms: string[] | undefined, action: ActionKey | string): boolean {
  return !!perms && (perms.includes("*") || perms.includes(actionPerm(action)));
}
