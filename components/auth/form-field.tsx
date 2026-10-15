interface FormFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password';
  autoComplete?: string;
  maxLength?: number;
}

export function FormField({ id, label, type = 'text', autoComplete, maxLength }: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block font-mono text-xs font-medium uppercase tracking-[0.1em] text-fg-muted"
      >
        {label}
      </label>
      {/* border-fg-muted, not border-rule: control edges need 3:1, the rule token is 14% alpha */}
      <input
        id={id}
        name={id}
        type={type}
        required
        autoComplete={autoComplete}
        maxLength={maxLength}
        className="block h-11 w-full rounded-sm border border-fg-muted bg-surface px-3 text-base text-fg"
      />
    </div>
  );
}
