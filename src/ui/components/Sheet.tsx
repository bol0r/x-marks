import { useEffect } from "preact/hooks";
import type { ComponentChildren } from "preact";

export function Sheet({ children, onClose }: { children: ComponentChildren; onClose: () => void }) {
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", keys);
    return () => document.removeEventListener("keydown", keys);
  }, [onClose]);
  return (
    <div
      class="sheet"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div class="box" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}
