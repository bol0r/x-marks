import { closeToast } from "../controller";
import { toast } from "../state";

export function Toast() {
  const t = toast.value;
  if (!t) return null;
  return (
    <div class="toast" role="status">
      <svg class="tx" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M20 20L80 80M80 20L20 80" />
      </svg>
      <p>
        {t.title}
        {t.sub ? <small>{t.sub}</small> : null}
      </p>
      {t.actions.map((a, i) => (
        <button
          type="button"
          key={a.label + i}
          onClick={() => {
            const undo = a.label === "Cofnij";
            closeToast(!undo);
            a.fn();
          }}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
