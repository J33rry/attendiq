"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import Icon from "./Icon";

const ToastCtx = createContext(null);

const STYLE = {
  success: { icon: "check", cls: "bg-sage-50 text-sage-700" },
  error: { icon: "alert", cls: "bg-coral-50 text-coral-700" },
  info: { icon: "info", cls: "bg-sky-50 text-sky-700" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((type, title, body) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-3), { id, type, title, body }]);
    setTimeout(() => dismiss(id), type === "error" ? 6500 : 4000);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (title, body) => push("success", title, body),
    error: (title, body) => push("error", title, body),
    info: (title, body) => push("info", title, body),
  }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex w-full max-w-sm animate-pop items-start gap-3 rounded-2xl bg-white p-3.5 pr-2 shadow-pop ring-1 ring-paper-300">
            <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${STYLE[t.type].cls}`}><Icon name={STYLE[t.type].icon} size={18} /></span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold text-ink-900">{t.title}</p>
              {t.body && <p className="text-sm text-ink-500">{t.body}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="grid size-7 place-items-center rounded-lg text-ink-300 hover:bg-paper-100 hover:text-ink-700" aria-label="Dismiss">
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
