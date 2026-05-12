import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PropostasTab from "@/components/dashboard/PropostasTab";
import ProjetosTab from "@/components/dashboard/ProjetosTab";
import ClientesTab from "@/components/dashboard/ClientesTab";
import AlocacaoTab from "@/components/dashboard/AlocacaoTab";
import ReceberTab from "@/components/dashboard/ReceberTab";
import AlertasTab from "@/components/dashboard/AlertasTab";
import AtividadesTab from "@/components/dashboard/AtividadesTab";
import { Plus, CalendarRange, CalendarIcon } from "lucide-react";
import { useProposals } from "@/hooks/useProposals";
import { usePersistedState } from "@/hooks/usePersistedState";
import {
  PeriodKey,
  getPeriodRange,
  buildYearOptions,
  MONTHS_PT_FULL,
} from "@/lib/dashboardFilters";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const ALL = "all";

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = usePersistedState<PeriodKey>("dashboard:period", "mes_atual");
  const range = useMemo(() => getPeriodRange(period), [period]);
  const { data: proposals } = useProposals();

  const yearOptions = useMemo(
    () =>
      buildYearOptions([
        ...(proposals ?? []).map((p) => p.created_at),
        ...(proposals ?? []).map((p) => p.data_aprovacao),
      ]),
    [proposals]
  );

  const { selMonth, selYear, isCustom } = useMemo(() => {
    if (period.startsWith("mes_ano:")) {
      const [y, m] = period.slice(8).split("-");
      return { selMonth: m, selYear: y, isCustom: false };
    }
    if (period.startsWith("ano:")) {
      return { selMonth: ALL, selYear: period.slice(4), isCustom: false };
    }
    if (period.startsWith("mes_all:")) {
      return { selMonth: period.slice(8), selYear: ALL, isCustom: false };
    }
    if (period.startsWith("mes:")) {
      const [y, m] = period.slice(4).split("-");
      return { selMonth: m, selYear: y, isCustom: false };
    }
    if (period === "tudo") return { selMonth: ALL, selYear: ALL, isCustom: false };
    if (period.startsWith("custom:")) return { selMonth: ALL, selYear: ALL, isCustom: true };
    return { selMonth: ALL, selYear: ALL, isCustom: false };
  }, [period]);

  const applyMonthYear = (month: string, year: string) => {
    if (month === ALL && year === ALL) return setPeriod("tudo");
    if (month !== ALL && year !== ALL) return setPeriod(`mes_ano:${year}-${month}` as PeriodKey);
    if (month === ALL && year !== ALL) return setPeriod(`ano:${year}` as PeriodKey);
    if (month !== ALL && year === ALL) return setPeriod(`mes_all:${month}` as PeriodKey);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão executiva do negócio</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" />
            <span>
              Período aplicado: <strong className="text-foreground">{range.label}</strong>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={selMonth}
            onValueChange={(v) => applyMonthYear(v, selYear)}
            disabled={isCustom}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os meses</SelectItem>
              <SelectSeparator />
              {MONTHS_PT_FULL.map((name, i) => {
                const v = String(i + 1).padStart(2, "0");
                return (
                  <SelectItem key={v} value={v}>
                    {name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Select
            value={selYear}
            onValueChange={(v) => applyMonthYear(selMonth, v)}
            disabled={isCustom}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os anos</SelectItem>
              <SelectSeparator />
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <CustomRangePicker
            value={period.startsWith("custom:") ? period : null}
            onChange={(p) => setPeriod(p)}
            onClear={() => setPeriod("tudo")}
          />

          <Button size="sm" onClick={() => navigate("/propostas")}>
            <Plus className="h-4 w-4 mr-1" /> Proposta
          </Button>
        </div>
      </div>

      <Tabs defaultValue="propostas" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="propostas">Propostas</TabsTrigger>
          <TabsTrigger value="projetos">Projetos</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="alocacao">Alocação</TabsTrigger>
          <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
          <TabsTrigger value="pagar">Contas a Pagar</TabsTrigger>
          <TabsTrigger value="alertas">Alertas</TabsTrigger>
          <TabsTrigger value="atividades">Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="propostas" className="mt-6">
          <PropostasTab />
        </TabsContent>
        <TabsContent value="projetos" className="mt-6">
          <ProjetosTab />
        </TabsContent>
        <TabsContent value="clientes" className="mt-6">
          <ClientesTab />
        </TabsContent>
        <TabsContent value="alocacao" className="mt-6">
          <AlocacaoTab />
        </TabsContent>
        <TabsContent value="receber" className="mt-6">
          <ReceberTab />
        </TabsContent>
        <TabsContent value="pagar" className="mt-6">
          <PlaceholderTab title="Dashboard de Contas a Pagar" comingSoon />
        </TabsContent>
        <TabsContent value="alertas" className="mt-6">
          <AlertasTab />
        </TabsContent>
        <TabsContent value="atividades" className="mt-6">
          <AtividadesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlaceholderTab({ title, comingSoon }: { title: string; comingSoon?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {comingSoon
            ? "Módulo em desenvolvimento. Em breve disponibilizaremos indicadores específicos aqui."
            : "Em breve: indicadores específicos para esta visão."}
        </p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────── CustomRangePicker ───────────────────────
function CustomRangePicker({
  value,
  onChange,
  onClear,
}: {
  value: string | null;
  onChange: (p: PeriodKey) => void;
  onClear: () => void;
}) {
  const parsed = useMemo(() => {
    if (!value || !value.startsWith("custom:")) return { from: undefined, to: undefined };
    const [s, e] = value.slice(7).split("_");
    return {
      from: s ? new Date(`${s}T00:00:00`) : undefined,
      to: e ? new Date(`${e}T00:00:00`) : undefined,
    };
  }, [value]);

  const [range, setRange] = useState<{ from?: Date; to?: Date }>(parsed);
  const [open, setOpen] = useState(false);

  const apply = () => {
    if (!range.from || !range.to) return;
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    onChange(`custom:${fmt(range.from)}_${fmt(range.to)}` as PeriodKey);
    setOpen(false);
  };

  const isActive = !!value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant={isActive ? "default" : "outline"} size="sm" className="gap-1.5">
          <CalendarIcon className="h-3.5 w-3.5" />
          {isActive && range.from && range.to
            ? `${format(range.from, "dd/MM/yy", { locale: ptBR })} – ${format(range.to, "dd/MM/yy", { locale: ptBR })}`
            : "Período"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="range"
          selected={range as any}
          onSelect={(r: any) => setRange(r ?? {})}
          locale={ptBR}
          numberOfMonths={2}
          className={cn("p-3 pointer-events-auto")}
        />
        <div className="flex items-center justify-between p-2 border-t">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setRange({});
              onClear();
              setOpen(false);
            }}
          >
            Limpar
          </Button>
          <Button size="sm" onClick={apply} disabled={!range.from || !range.to}>
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
