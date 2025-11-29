// src/helpers/exportData.ts
function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // small delay before revoking ensures download works in all browsers
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportAsJSON(data: any[], fileNamePrefix: string) {
  if (!data?.length) {
    alert("No data available to export.");
    return;
  }

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  triggerDownload(blob, `${fileNamePrefix}_${timestamp}.json`);
}

export function exportAsCSV(data: any[], fileNamePrefix: string) {
  if (!data?.length) {
    alert("No data available to export.");
    return;
  }

  // Collect headers
  const headers = Array.from(
    data.reduce((acc, row) => {
      Object.keys(row).forEach((key) => acc.add(key));
      return acc;
    }, new Set<string>())
  );

  // Build CSV
  const csvRows = [
    headers.join(","), // header row
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return "";
          if (typeof value === "string") {
            return `"${value.replace(/"/g, '""')}"`; // escape quotes
          }
          return value;
        })
        .join(",")
    ),
  ];

  const csvString = csvRows.join("\n");

  // Add BOM for Excel compatibility
  const blob = new Blob(["\uFEFF" + csvString], {
    type: "text/csv;charset=utf-8;",
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  triggerDownload(blob, `${fileNamePrefix}_${timestamp}.csv`);
}
