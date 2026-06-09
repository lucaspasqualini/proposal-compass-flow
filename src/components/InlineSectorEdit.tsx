import { useState, useMemo } from "react";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SECTORS, SECTORS_MAP, UFS, isForeignUf } from "@/lib/sectors";

const triggerCls =
  "inline-flex items-center gap-1 text-primary hover:underline focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:no-underline";
const placeholderCls = "inline-flex items-center gap-1 italic text-muted-foreground hover:underline focus:outline-none";

interface BaseProps {
  disabled?: boolean;
}

export function InlineSetorEdit({
  value,
  onChange,
  disabled,
}: BaseProps & { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled} className={value ? triggerCls : placeholderCls}>
          {value || "Selecionar setor"}
          {!disabled && <ChevronDown className="h-3 w-3 opacity-60" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-72" align="start">
        <Command>
          <CommandInput placeholder="Buscar setor..." />
          <CommandList className="max-h-72">
            <CommandEmpty>Nenhum setor.</CommandEmpty>
            <CommandGroup>
              {SECTORS.map((s) => (
                <CommandItem
                  key={s}
                  value={s}
                  onSelect={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate">{s}</span>
                  {value === s && <Check className="h-4 w-4 opacity-70" />}
                </CommandItem>
              ))}
            </CommandGroup>
            {value && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__clear__"
                    onSelect={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="text-muted-foreground"
                  >
                    Limpar setor
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function InlineSubsetorEdit({
  setor,
  value,
  onChange,
  disabled,
}: BaseProps & { setor: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const options = useMemo(() => (setor ? SECTORS_MAP[setor] ?? [] : []), [setor]);
  const isDisabled = disabled || !setor || options.length === 0;
  return (
    <Popover open={open} onOpenChange={(o) => !isDisabled && setOpen(o)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={isDisabled}
          className={value ? triggerCls : placeholderCls}
          title={!setor ? "Selecione um setor primeiro" : undefined}
        >
          {value || (setor ? "Selecionar sub-setor" : "Sub-setor")}
          {!isDisabled && <ChevronDown className="h-3 w-3 opacity-60" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-72" align="start">
        <Command>
          <CommandInput placeholder="Buscar sub-setor..." />
          <CommandList className="max-h-72">
            <CommandEmpty>Nenhum sub-setor.</CommandEmpty>
            <CommandGroup>
              {options.map((s) => (
                <CommandItem
                  key={s}
                  value={s}
                  onSelect={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate">{s}</span>
                  {value === s && <Check className="h-4 w-4 opacity-70" />}
                </CommandItem>
              ))}
            </CommandGroup>
            {value && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__clear__"
                    onSelect={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="text-muted-foreground"
                  >
                    Limpar sub-setor
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function InlineUfEdit({
  value,
  onChange,
  disabled,
}: BaseProps & { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [foreignMode, setForeignMode] = useState(() => isForeignUf(value));
  const [foreignText, setForeignText] = useState(() => (isForeignUf(value) ? value : ""));

  const display = value || "";
  const isForeign = isForeignUf(value);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (disabled) return;
        setOpen(o);
        if (o) {
          setForeignMode(isForeign);
          setForeignText(isForeign ? value : "");
        }
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled} className={display ? triggerCls : placeholderCls}>
          {isForeign && <Globe2 className="h-3 w-3" />}
          {display || "UF"}
          {!disabled && <ChevronDown className="h-3 w-3 opacity-60" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-64" align="start">
        {foreignMode ? (
          <div className="p-3 space-y-3">
            <Label className="text-xs">Empresa estrangeira — país</Label>
            <Input
              autoFocus
              value={foreignText}
              onChange={(e) => setForeignText(e.target.value)}
              placeholder="Ex: Estados Unidos"
              onKeyDown={(e) => {
                if (e.key === "Enter" && foreignText.trim()) {
                  onChange(foreignText.trim());
                  setOpen(false);
                }
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setForeignMode(false)}
                className="text-xs"
              >
                Voltar para UF
              </Button>
              <Button
                size="sm"
                disabled={!foreignText.trim()}
                onClick={() => {
                  onChange(foreignText.trim());
                  setOpen(false);
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <Command>
            <CommandInput placeholder="Buscar estado..." />
            <CommandList className="max-h-72">
              <CommandEmpty>Nenhum estado.</CommandEmpty>
              <CommandGroup heading="Estados (Brasil)">
                {UFS.map((u) => (
                  <CommandItem
                    key={u.sigla}
                    value={`${u.sigla} ${u.nome}`}
                    onSelect={() => {
                      onChange(u.sigla);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">
                      <span className="font-medium">{u.sigla}</span>
                      <span className="text-muted-foreground"> · {u.nome}</span>
                    </span>
                    {value === u.sigla && <Check className="h-4 w-4 opacity-70" />}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="__foreign__"
                  onSelect={() => setForeignMode(true)}
                  className={cn("gap-2", isForeign && "text-primary")}
                >
                  <Globe2 className="h-4 w-4" />
                  Empresa estrangeira{isForeign ? ` (${value})` : ""}
                </CommandItem>
                {value && (
                  <CommandItem
                    value="__clear__"
                    onSelect={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="text-muted-foreground"
                  >
                    Limpar
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}
