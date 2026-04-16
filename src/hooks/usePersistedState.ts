import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";

export const FILTER_KEY_PREFIX = "filter:";

/**
 * useState drop-in que persiste em sessionStorage.
 * - Sobrevive a navegações entre rotas (mesma aba)
 * - Reseta ao recarregar a página (handled em main.tsx)
 * - Reseta no logout (handled em AuthContext)
 * - Reseta ao fechar a aba (comportamento nativo do sessionStorage)
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const fullKey = `${FILTER_KEY_PREFIX}${key}`;

  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const raw = sessionStorage.getItem(fullKey);
      if (raw === null) return initialValue;
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  });

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      sessionStorage.setItem(fullKey, JSON.stringify(state));
    } catch {
      // ignore quota / serialization errors
    }
  }, [fullKey, state]);

  return [state, setState];
}

/** Limpa todas as chaves de filtros persistidos. */
export function clearPersistedFilters() {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(FILTER_KEY_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}
