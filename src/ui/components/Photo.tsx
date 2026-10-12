import { useEffect } from "preact/hooks";
import { useSignal } from "@preact/signals";
import { photoTick, photoURL } from "../photos";

export function Photo({ id, class: className }: { id: string; class?: string }) {
  const src = useSignal<string | null>(null);
  const tick = photoTick.value;
  useEffect(() => {
    let on = true;
    void photoURL(id).then((u) => {
      if (on) src.value = u;
    });
    return () => {
      on = false;
    };
  }, [id, tick]);
  if (!src.value) return null;
  return <img class={className} alt="" src={src.value} />;
}
