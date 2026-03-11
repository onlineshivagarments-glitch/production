// PDF export using browser's print API

export interface TailorPdfRecord {
  date: string;
  employeeName: string;
  articleNo: string;
  color: string;
  size: string;
  pcsGiven: number;
  tailorRate: number;
  tailorAmount: number;
}

export interface AdditionalWorkPdfRecord {
  date: string;
  employeeName: string;
  articleNo: string;
  color: string;
  size: string;
  workType: string;
  pcsDone: number;
  ratePerPcs: number;
  totalAmount: number;
}

function printHtml(html: string) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Please allow pop-ups to export PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 500);
}

const styles = `
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; margin: 20px; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  h2 { font-size: 15px; margin-bottom: 10px; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #1a1a2e; color: #fff; padding: 8px 6px; text-align: left; font-size: 12px; }
  td { padding: 6px; border-bottom: 1px solid #ddd; font-size: 12px; }
  tr:nth-child(even) td { background: #f7f7f7; }
  .totals { margin-top: 16px; border-top: 2px solid #333; padding-top: 10px; }
  .totals table { width: auto; }
  .totals td { font-weight: bold; padding: 4px 12px 4px 0; border: none; }
  .footer { margin-top: 30px; font-size: 11px; color: #999; }
  @media print { button { display: none; } }
`;

export function exportTailorPdf(
  records: TailorPdfRecord[],
  title: string,
  subtitle: string,
) {
  if (records.length === 0) {
    alert("No records to export.");
    return;
  }
  const totalPcs = records.reduce((s, r) => s + r.pcsGiven, 0);
  const totalAmt = records.reduce((s, r) => s + r.tailorAmount, 0);

  const rows = records
    .map(
      (r) => `
    <tr>
      <td>${r.date}</td>
      <td>${r.employeeName}</td>
      <td>${r.articleNo}</td>
      <td>${r.color || "-"}</td>
      <td>${r.size || "-"}</td>
      <td>${r.pcsGiven}</td>
      <td>₹${r.tailorRate}</td>
      <td>₹${r.tailorAmount.toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${styles}</style></head><body>
    <h1>Production Master Pro</h1>
    <h2>${title}</h2>
    <p style="color:#555;font-size:12px">${subtitle}</p>
    <table>
      <thead><tr>
        <th>Date</th><th>Employee</th><th>Article</th><th>Color</th><th>Size</th><th>Pieces</th><th>Rate</th><th>Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <table>
        <tr><td>Total Pieces:</td><td>${totalPcs}</td></tr>
        <tr><td>Total Payment:</td><td>₹${totalAmt.toFixed(2)}</td></tr>
      </table>
    </div>
    <div class="footer">Generated: ${new Date().toLocaleString("en-IN")} | Production Master Pro</div>
  </body></html>`;

  printHtml(html);
}

export function exportAdditionalWorkPdf(
  records: AdditionalWorkPdfRecord[],
  title: string,
  subtitle: string,
) {
  if (records.length === 0) {
    alert("No records to export.");
    return;
  }
  const totalPcs = records.reduce((s, r) => s + r.pcsDone, 0);
  const totalAmt = records.reduce((s, r) => s + r.totalAmount, 0);

  const rows = records
    .map(
      (r) => `
    <tr>
      <td>${r.date}</td>
      <td>${r.employeeName}</td>
      <td>${r.workType}</td>
      <td>${r.articleNo}</td>
      <td>${r.color || "-"}</td>
      <td>${r.size || "-"}</td>
      <td>${r.pcsDone}</td>
      <td>₹${r.ratePerPcs}</td>
      <td>₹${r.totalAmount.toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${styles}</style></head><body>
    <h1>Production Master Pro</h1>
    <h2>${title}</h2>
    <p style="color:#555;font-size:12px">${subtitle}</p>
    <table>
      <thead><tr>
        <th>Date</th><th>Employee</th><th>Work Type</th><th>Article</th><th>Color</th><th>Size</th><th>Pieces</th><th>Rate</th><th>Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <table>
        <tr><td>Total Pieces:</td><td>${totalPcs}</td></tr>
        <tr><td>Total Net Payment:</td><td>₹${totalAmt.toFixed(2)}</td></tr>
      </table>
    </div>
    <div class="footer">Generated: ${new Date().toLocaleString("en-IN")} | Production Master Pro</div>
  </body></html>`;

  printHtml(html);
}
