import { useState, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface PromptState {
  open: boolean;
  proposalTitle?: string;
  resolve?: (count: number | null) => void;
}

export function buildParcelasFromCount(count: number) {
  if (count <= 1) return [{ descricao: "Parcela Única", valor: 100, vencimento: null }];
  if (count === 2) return [
    { descricao: "Parcela 1", valor: 50, vencimento: null },
    { descricao: "Parcela 2", valor: 50, vencimento: null },
  ];
  // 3
  return [
    { descricao: "Parcela 1", valor: 33.34, vencimento: null },
    { descricao: "Parcela 2", valor: 33.33, vencimento: null },
    { descricao: "Parcela 3", valor: 33.33, vencimento: null },
  ];
}

export function useParcelasPrompt() {
  const [state, setState] = useState<PromptState>({ open: false });
  const [count, setCount] = useState("1");
  const resolverRef = useRef<((v: number | null) => void) | null>(null);

  const ask = useCallback((proposalTitle?: string) => {
    setCount("1");
    return new Promise<number | null>((resolve) => {
      resolverRef.current = resolve;
      setState({ open: true, proposalTitle });
    });
  }, []);

  const finish = (value: number | null) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState({ open: false });
  };

  const dialog = (
    <Dialog open={state.open} onOpenChange={(o) => { if (!o) finish(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quantas parcelas terá esse projeto?</DialogTitle>
          <DialogDescription>
            {state.proposalTitle ? `Proposta: ${state.proposalTitle}. ` : ""}
            Esta proposta não tem parcelas configuradas. Selecione a quantidade para gerar o contas a receber.
          </DialogDescription>
        </DialogHeader>
        <RadioGroup value={count} onValueChange={setCount} className="space-y-2">
          {["1", "2", "3"].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <RadioGroupItem value={n} id={`parc-${n}`} />
              <Label htmlFor={`parc-${n}`} className="cursor-pointer">
                {n} parcela{n === "1" ? " única (100%)" : n === "2" ? "s (50% / 50%)" : "s (33,34% / 33,33% / 33,33%)"}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <DialogFooter>
          <Button variant="outline" onClick={() => finish(null)}>Cancelar</Button>
          <Button onClick={() => finish(parseInt(count, 10))}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { ask, dialog };
}
