"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type ToastItem = { id: number; message: string };

type ToastContextValue = {
  toast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  function toast(message: string) {
    const id = Date.now();
    setItems((current) => [...current, { id, message }].slice(-3));
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 4_000);
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex flex-col items-end gap-2 md:bottom-6"
      >
        {items.map((item) => (
          <div
            className="pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border border-primary/40 bg-card p-3 text-sm text-foreground"
            key={item.id}
            role="status"
          >
            <Check
              aria-hidden="true"
              className="size-4 shrink-0 text-primary"
            />
            <p className="flex-1">{item.message}</p>
            <Button
              aria-label="Dismiss notification"
              onClick={() =>
                setItems((current) =>
                  current.filter((entry) => entry.id !== item.id),
                )
              }
              size="sm"
              type="button"
              variant="ghost"
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");
  return context;
}
