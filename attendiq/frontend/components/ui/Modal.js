"use client";
import { useEffect, useRef } from "react";
import Icon from "./Icon";
import { Button } from "./primitives";

/** Accessible dialog: bottom sheet on phones, centred card on larger screens. */
export function Modal({ open, onClose, title, description, children, footer, size = "md" }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const onKey = (e) => e.key === "Escape" && closeRef.current?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    const first = ref.current?.querySelector("input, select, textarea, button:not([data-close])");
    first?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="absolute inset-0 animate-fade bg-ink-900/30 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref}
        className={`relative max-h-[92vh] w-full animate-pop overflow-y-auto rounded-t-[1.75rem] bg-paper-50 p-5 shadow-pop sm:rounded-[1.5rem] sm:p-6 ${size === "sm" ? "sm:max-w-md" : "sm:max-w-lg"}`}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-paper-300 sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="text-xl font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
          </div>
          <button data-close onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-full text-ink-400 hover:bg-paper-200 hover:text-ink-900" aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = "Confirm", tone = "danger", loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={loading}>Keep it as is</Button>
        <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </>}>
      <div className="text-sm text-ink-700">{children}</div>
    </Modal>
  );
}
