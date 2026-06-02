import { useEffect, useState } from "react";

/** Retorna `value` com atraso de `delay` ms — bom para inputs de busca em listas grandes. */
export function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
