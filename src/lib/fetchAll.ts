// Helper para buscar todos os registros de uma query Supabase paginada,
// contornando o limite padrão de 1000 linhas por requisição.
const PAGE_SIZE = 1000;

type QueryBuilder<T> = {
  range: (from: number, to: number) => Promise<{ data: T[] | null; error: any }> & {
    range: (from: number, to: number) => any;
  };
};

export async function fetchAllPaginated<T = any>(
  buildQuery: () => any
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await buildQuery().range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}
