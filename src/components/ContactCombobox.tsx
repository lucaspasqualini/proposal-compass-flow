import { useState, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Check, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContactOption {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  cargo?: string | null;
}

interface ContactComboboxProps {
  value: string;
  onChange: (name: string) => void;
  onSelect?: (contact: ContactOption) => void;
  onBlur?: () => void;
  contacts: ContactOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Combobox simples: input livre + lista de sugestões abaixo.
 * - Digitar livremente = novo contato (persistido pelo consumidor).
 * - Clique em item = preenche nome (e dispara onSelect com dados completos).
 */
export default function ContactCombobox({
  value, onChange, onSelect, onBlur, contacts, placeholder, className, disabled,
}: ContactComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return contacts.slice(0, 8);
    return contacts
      .filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [contacts, value]);

  const exactMatch = contacts.some((c) => c.name.trim().toLowerCase() === value.trim().toLowerCase());
  const showNewHint = !!value.trim() && !exactMatch;

  return (
    <div className="relative" ref={containerRef}>
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          // Fecha popover se foco saiu do container inteiro
          setTimeout(() => {
            if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
              setOpen(false);
              onBlur?.();
            }
          }, 150);
        }}
        placeholder={placeholder ?? "Nome do contato"}
        className={className}
        disabled={disabled}
        autoComplete="off"
      />
      {open && !disabled && (filtered.length > 0 || showNewHint) && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-md border bg-popover shadow-md max-h-64 overflow-y-auto py-1">
          {filtered.map((c) => {
            const selected = c.name.trim().toLowerCase() === value.trim().toLowerCase();
            return (
              <button
                type="button"
                key={c.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(c.name);
                  onSelect?.(c);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2",
                  selected && "bg-accent"
                )}
              >
                <Check className={cn("h-3 w-3", selected ? "opacity-100" : "opacity-0")} />
                <span className="flex-1 truncate">
                  <span className="font-medium">{c.name}</span>
                  {c.email && <span className="text-muted-foreground"> · {c.email}</span>}
                </span>
              </button>
            );
          })}
          {showNewHint && (
            <div className="border-t mt-1 px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
              <UserPlus className="h-3 w-3" />
              Novo contato: <strong className="text-foreground">"{value.trim()}"</strong> — será adicionado ao salvar.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
