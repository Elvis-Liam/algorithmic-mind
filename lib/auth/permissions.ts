// Single source of truth: role to capability. Imported by the interface
// (to hide what a user cannot do) and by the server (to reject it). Hiding is
// a convenience, never a control: every server entry point calls authorize()
// or requireCapability(), which read this same table.
// This file has no imports so it is safe in server and client code.

export const ROLES = ['reporter', 'author', 'editor', 'administrator', 'super_admin'] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export const ROLE_LABELS: Record<Role, string> = {
  reporter: 'Reporter',
  author: 'Author',
  editor: 'Editor',
  administrator: 'Administrator',
  super_admin: 'Super administrator',
};

export const CAPABILITY_LABELS = {
  'studio:access': 'Open the studio',
  'discovery:read': 'Read the news discovery pipeline',
  'article:write_own_draft': 'Write and edit your own drafts',
  'article:submit_for_review': 'Submit your drafts for review',
  'article:write_any': 'Edit any article',
  'article:publish': 'Publish articles',
  'article:delete': 'Delete articles (recoverable)',
  'article:hard_delete': 'Permanently delete articles',
  'admin:access': 'Open the administration area',
  'user:manage': 'Activate accounts and change roles',
  'user:manage_privileged': 'Manage administrator and super administrator accounts',
  'audit:read': 'Read the audit log',
  'subscribers:read': 'Read newsletter subscribers',
  'site:manage': 'Manage settings, ads, navigation and redirects',
} as const;

export type Capability = keyof typeof CAPABILITY_LABELS;
export const CAPABILITIES = Object.keys(CAPABILITY_LABELS) as Capability[];

const set = (...caps: Capability[]): ReadonlySet<Capability> => new Set(caps);

const EDITOR_CAPS: Capability[] = [
  'studio:access',
  'discovery:read',
  'article:write_own_draft',
  'article:submit_for_review',
  'article:write_any',
  'article:publish',
  'article:delete',
];

const ADMIN_CAPS: Capability[] = [
  ...EDITOR_CAPS,
  'admin:access',
  'user:manage',
  'audit:read',
  'subscribers:read',
  'site:manage',
];

export const ROLE_CAPABILITIES: Record<Role, ReadonlySet<Capability>> = {
  reporter: set('studio:access', 'discovery:read', 'article:write_own_draft'),
  author: set('studio:access', 'article:write_own_draft', 'article:submit_for_review'),
  editor: set(...EDITOR_CAPS),
  administrator: set(...ADMIN_CAPS),
  super_admin: set(...ADMIN_CAPS, 'user:manage_privileged', 'article:hard_delete'),
};

export function can(role: Role | null | undefined, capability: Capability): boolean {
  return role ? ROLE_CAPABILITIES[role].has(capability) : false;
}

const isPrivileged = (role: Role) => role === 'administrator' || role === 'super_admin';

/**
 * Whether `actor` may move an account from `from` to `to` (use the same value
 * for both to ask "may this actor touch this account at all").
 * Administrators manage reporter, author and editor accounts only.
 * Anything involving administrator or super_admin needs super_admin.
 */
export function canAssignRole(actor: Role, from: Role, to: Role): boolean {
  if (!can(actor, 'user:manage')) return false;
  if (isPrivileged(from) || isPrivileged(to)) return can(actor, 'user:manage_privileged');
  return true;
}

/** Where a signed in, active user lands. Change the admin value when the admin area exists. */
export const LANDING_PATH: Record<Role, string> = {
  reporter: '/studio',
  author: '/studio',
  editor: '/studio',
  administrator: '/studio',
  super_admin: '/studio',
};

export function landingPathFor(role: Role): string {
  return LANDING_PATH[role];
}
