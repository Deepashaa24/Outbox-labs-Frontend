interface SpinnerProps {
  label?: string;
  className?: string;
}

export function Spinner({ label = "Loading", className = "" }: SpinnerProps) {
  return (
    <span className={`inline-flex items-center gap-3 text-sm text-slate-500 ${className}`} role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950" aria-hidden="true" />
      {label}
    </span>
  );
}
