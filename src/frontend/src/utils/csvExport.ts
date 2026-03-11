/**
 * Export data to a CSV file and trigger browser download.
 */
export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  const escapeCell = (value: string | number): string => {
    const str = String(value);
    // Wrap in quotes if contains comma, newline, or double-quote
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines: string[] = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];

  const csvContent = csvLines.join("\n");
  const blob = new Blob([`\uFEFF${csvContent}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
