import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface Props {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (s: number) => void;
  pageSizeOptions?: number[];
}

/** Controles de paginação para listas locais. */
export function TablePagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [50, 100, 200, 500],
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // Corrigir página fora do range quando filtros mudam
  useEffect(() => {
    if (page > totalPages) onPageChange(totalPages);
  }, [page, totalPages, onPageChange]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-t bg-muted/30 text-sm">
      <div className="text-muted-foreground">
        {total === 0 ? "Nenhum registro" : `${from}–${to} de ${total}`}
      </div>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Linhas:</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="h-7 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => onPageChange(1)} aria-label="Primeira página">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Página anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs px-2">{page} / {totalPages}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Próxima página">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} aria-label="Última página">
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Helper para fatiar lista paginada. */
export function usePaginatedSlice<T>(list: T[], page: number, pageSize: number): T[] {
  return useMemo(() => list.slice((page - 1) * pageSize, page * pageSize), [list, page, pageSize]);
}
