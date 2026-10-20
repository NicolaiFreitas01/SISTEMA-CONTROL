import Papa from "papaparse";
export async function exportRows(
  rows: Record<string, unknown>[],
  type: "csv" | "xlsx" | "pdf",
  name = "labirinex-relatorio",
) {
  if (!rows.length) throw new Error("Não existem registros para exportar.");
  if (type === "csv") {
    download(
      new Blob(["\uFEFF" + Papa.unparse(rows, { escapeFormulae: true })], {
        type: "text/csv;charset=utf-8;",
      }),
      `${name}.csv`,
    );
  } else if (type === "xlsx") {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const headers = Object.keys(rows[0]);
    const cells = [
      headers.map((value) => ({ value, fontWeight: "bold" as const })),
      ...rows.map((r) =>
        headers.map((k) => ({
          value:
            typeof r[k] === "number" ? (r[k] as number) : String(r[k] ?? ""),
        })),
      ),
    ];
    await writeXlsxFile(cells).toFile(`${name}.xlsx`);
  } else {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("LABIRINEX CONTROL | Relatório", 14, 15);
    autoTable(doc, {
      head: [Object.keys(rows[0])],
      body: rows.map((r) => Object.values(r).map((v) => String(v ?? ""))),
      startY: 23,
      styles: { fontSize: 8 },
    });
    doc.save(`${name}.pdf`);
  }
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
