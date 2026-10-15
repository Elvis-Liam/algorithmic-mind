import { signOutAction } from '@/app/auth/actions';

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="h-11 rounded-sm border border-fg-muted bg-transparent px-4 text-sm font-semibold text-fg hover:bg-surface"
      >
        Sign out
      </button>
    </form>
  );
}
