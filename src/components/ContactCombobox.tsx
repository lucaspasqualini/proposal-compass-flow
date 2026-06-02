import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
 * Input com autocomplete dos contatos existentes da empresa.
 * - Digitar livre = novo contato (a criação efetiva é responsabilidade do consumidor no submit/blur).
 * - Selecionar item da lista = dispara onSelect com os dados completos (email/phone/cargo).
 */
export default function ContactCombobox({
  value, onChange, onSelect, contacts, placeholder, className, disabled,
}: ContactComboboxProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => { onChange(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? "Nome do contato"}
          className={className}
          disabled={disabled}
          autoComplete="off"
        />
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[--radix-popover-trigger-width]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 && !showNewHint && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum contato cadastrado.</p>
          )}
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
              Novo contato: <strong className="text-foreground">"{value.trim()}"</strong> — será adicionado à base.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
