// Carrega xlsx dinamicamente apenas quando o usuário aciona a exportação,
// evitando inflar o bundle inicial das páginas.
export async function exportToExcel(
  data: Record<string, string | number | null>[],
  filename: string
) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");

  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => String(row[key] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws["!cols"] = colWidths;

  XLSX.writeFile(wb, `${filename}.xlsx`);
}
