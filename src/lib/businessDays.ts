// Adiciona N dias úteis a uma data, pulando sábados e domingos.
// Feriados nacionais não são considerados nesta versão.
export function addBusinessDays(date: Date, n: number): Date {
  const d = new Date(date);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}
