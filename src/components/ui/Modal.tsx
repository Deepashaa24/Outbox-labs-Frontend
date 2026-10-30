import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
  hideHeader?: boolean;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  className = "",
  overlayClassName = "",
  hideHeader = false
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm ${overlayClassName}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={hideHeader ? undefined : "modal-title"}
        aria-label={hideHeader ? title : undefined}
        className={`max-h-[min(90vh,56rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ${className}`}
      >
        {!hideHeader && (
          <div className="mb-5 flex items-center justify-between">
            <h2 id="modal-title" className="text-lg font-semibold text-slate-900">{title}</h2>
            <button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose} aria-label="Close dialog">
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </section>
    </div>
  );
}
