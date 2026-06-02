import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

/**
 * Searchable Select — API compatível com o Radix Select usado anteriormente
 * (Select / SelectTrigger / SelectValue / SelectContent / SelectItem / SelectGroup / SelectLabel / SelectSeparator),
 * porém com campo de digitação para busca dentro do dropdown.
 */

type Ctx = {
  value: string;
  onValueChange: (v: string) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  disabled?: boolean;
  labels: Map<string, React.ReactNode>;
  registerLabel: (value: string, label: React.ReactNode) => void;
};

const SelectCtx = React.createContext<Ctx | null>(null);
const useSelectCtx = () => {
  const ctx = React.useContext(SelectCtx);
  if (!ctx) throw new Error("Select.* deve ser usado dentro de <Select>");
  return ctx;
};

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({
  value,
  defaultValue,
  onValueChange,
  disabled,
  open: controlledOpen,
  onOpenChange,
  children,
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const actualValue = value !== undefined ? value : internalValue;
  const handleChange = (v: string) => {
    if (value === undefined) setInternalValue(v);
    onValueChange?.(v);
  };

  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (o: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(o);
    onOpenChange?.(o);
  };

  const labelsRef = React.useRef(new Map<string, React.ReactNode>());
  const [, force] = React.useReducer((x) => x + 1, 0);
  const registerLabel = React.useCallback((v: string, l: React.ReactNode) => {
    if (!labelsRef.current.has(v)) {
      labelsRef.current.set(v, l);
      force();
    } else {
      labelsRef.current.set(v, l);
    }
  }, []);

  const ctxValue = React.useMemo<Ctx>(
    () => ({
      value: actualValue,
      onValueChange: handleChange,
      open,
      setOpen,
      disabled,
      labels: labelsRef.current,
      registerLabel,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actualValue, open, disabled],
  );

  return (
    <SelectCtx.Provider value={ctxValue}>
      <Popover open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
        <LabelRegistrar>{children}</LabelRegistrar>
      </Popover>
    </SelectCtx.Provider>
  );
};

/** Percorre os filhos para registrar labels de SelectItem antes do popover abrir. */
const LabelRegistrar: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const ctx = useSelectCtx();
  React.useEffect(() => {
    const walk = (nodes: React.ReactNode) => {
      React.Children.forEach(nodes, (child) => {
        if (!React.isValidElement<any>(child)) return;
        if ((child.type as any) === SelectItem) {
          ctx.registerLabel(child.props.value, child.props.children);
        } else if (child.props?.children) {
          walk(child.props.children);
        }
      });
    };
    walk(children);
  }, [children, ctx]);
  return <>{children}</>;
};

const SelectGroup: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;

interface SelectValueProps {
  placeholder?: string;
  className?: string;
}
const SelectValue: React.FC<SelectValueProps> = ({ placeholder, className }) => {
  const ctx = useSelectCtx();
  const label = ctx.value ? ctx.labels.get(ctx.value) : undefined;
  return (
    <span className={cn(!label && "text-muted-foreground", className)}>
      {label ?? placeholder ?? ""}
    </span>
  );
};

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const ctx = useSelectCtx();
  return (
    <PopoverTrigger asChild>
      <button
        ref={ref}
        type="button"
        disabled={ctx.disabled || props.disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className,
        )}
        {...props}
      >
        <span className="flex-1 text-left truncate">{children}</span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </button>
    </PopoverTrigger>
  );
});
SelectTrigger.displayName = "SelectTrigger";

interface SelectContentProps {
  className?: string;
  children?: React.ReactNode;
  position?: "popper" | "item-aligned";
  searchPlaceholder?: string;
  emptyMessage?: string;
}
const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, searchPlaceholder = "Buscar...", emptyMessage = "Nenhum resultado." }, ref) => {
    return (
      <PopoverContent
        ref={ref}
        align="start"
        sideOffset={4}
        className={cn(
          "p-0 w-[var(--radix-popover-trigger-width)] min-w-[8rem] max-h-96 overflow-hidden",
          className,
        )}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-80">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>{children}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    );
  },
);
SelectContent.displayName = "SelectContent";

function getText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getText).join(" ");
  if (React.isValidElement<any>(node)) return getText(node.props.children);
  return "";
}

interface SelectItemProps {
  value: string;
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}
const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ value, children, disabled, className }, ref) => {
    const ctx = useSelectCtx();
    const text = React.useMemo(() => getText(children), [children]);
    React.useEffect(() => {
      ctx.registerLabel(value, children);
    }, [value, children, ctx]);
    const selected = ctx.value === value;
    return (
      <CommandItem
        ref={ref as any}
        value={`${value} ${text}`}
        disabled={disabled}
        onSelect={() => {
          ctx.onValueChange(value);
          ctx.setOpen(false);
        }}
        className={cn("flex items-center justify-between gap-2 cursor-pointer", className)}
      >
        <span className="flex-1 min-w-0 truncate">{children}</span>
        {selected && <Check className="h-4 w-4 shrink-0 opacity-70" />}
      </CommandItem>
    );
  },
);
SelectItem.displayName = "SelectItem";

const SelectLabel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("py-1.5 px-2 text-xs font-semibold text-muted-foreground", className)} {...props} />
);

const SelectSeparator: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
);

// Stubs para compatibilidade
const SelectScrollUpButton: React.FC<React.HTMLAttributes<HTMLDivElement>> = () => null;
const SelectScrollDownButton: React.FC<React.HTMLAttributes<HTMLDivElement>> = () => null;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
