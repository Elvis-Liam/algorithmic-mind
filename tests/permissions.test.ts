import { describe, expect, it } from 'vitest';
import {
  CAPABILITIES,
  ROLES,
  ROLE_CAPABILITIES,
  can,
  canAssignRole,
  landingPathFor,
} from '@/lib/auth/permissions';
import { safeRedirectPath } from '@/lib/auth/redirects';

describe('permissions matrix', () => {
  it('only editors and above can publish', () => {
    expect(ROLES.filter((r) => can(r, 'article:publish'))).toEqual([
      'editor',
      'administrator',
      'super_admin',
    ]);
  });

  it('authors and reporters cannot publish, delete or manage users', () => {
    for (const role of ['reporter', 'author'] as const) {
      for (const cap of ['article:publish', 'article:delete', 'article:hard_delete', 'user:manage'] as const) {
        expect(can(role, cap)).toBe(false);
      }
    }
  });

  it('only super administrators can hard delete', () => {
    expect(ROLES.filter((r) => can(r, 'article:hard_delete'))).toEqual(['super_admin']);
  });

  it('every capability is granted to at least one role', () => {
    for (const cap of CAPABILITIES) {
      expect(ROLES.some((r) => ROLE_CAPABILITIES[r].has(cap)), cap).toBe(true);
    }
  });

  it('a missing role has no capabilities', () => {
    expect(can(null, 'studio:access')).toBe(false);
    expect(can(undefined, 'studio:access')).toBe(false);
  });

  it('every role has a landing path', () => {
    for (const r of ROLES) expect(landingPathFor(r).startsWith('/')).toBe(true);
  });
});

describe('role assignment rules', () => {
  it('administrators manage reporter, author and editor only', () => {
    expect(canAssignRole('administrator', 'reporter', 'editor')).toBe(true);
    expect(canAssignRole('administrator', 'editor', 'administrator')).toBe(false);
    expect(canAssignRole('administrator', 'administrator', 'editor')).toBe(false);
    expect(canAssignRole('administrator', 'super_admin', 'super_admin')).toBe(false);
  });

  it('super administrators manage everyone', () => {
    expect(canAssignRole('super_admin', 'editor', 'administrator')).toBe(true);
    expect(canAssignRole('super_admin', 'administrator', 'reporter')).toBe(true);
  });

  it('editors, authors and reporters manage nobody', () => {
    for (const role of ['editor', 'author', 'reporter'] as const) {
      expect(canAssignRole(role, 'reporter', 'author')).toBe(false);
    }
  });
});

describe('redirect allowlist', () => {
  const fallback = '/studio';
  it.each([
    ['/studio', '/studio'],
    ['/studio/articles?page=2', '/studio/articles?page=2'],
    ['/account', '/account'],
    ['/admin/users', '/admin/users'],
  ])('allows %s', (input, expected) => {
    expect(safeRedirectPath(input, fallback)).toBe(expected);
  });

  it.each([
    ['//evil.example'],
    ['/\\evil.example'],
    ['https://evil.example/studio'],
    ['javascript:alert(1)'],
    ['/studioevil'],
    ['/studio/../evil'],
    ['/studio/%2e%2e/evil'],
    ['/'],
    ['/articles/some-post'],
    ['/studio\n/x'],
    [''],
    [undefined],
    [42],
    ['/' + 'a'.repeat(600)],
  ])('rejects %j', (input) => {
    expect(safeRedirectPath(input as unknown, fallback)).toBe(fallback);
  });
});
