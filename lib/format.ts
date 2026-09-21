/** "1827749.88" -> "1,827,749.88" — every dollar amount shown anywhere
 * (PDF, email body, supplier table, send history) goes through this,
 * so a remittance advice never shows a bare unseparated number. */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
