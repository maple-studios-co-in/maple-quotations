export type NavItem = { tool: string; label: string; href: string };
export const SUITE_DOMAIN = process.env.NEXT_PUBLIC_SUITE_DOMAIN || ".maplefurnishers.com";
export const TOOLS: { tool: string; label: string }[] = [
  { tool: "leads", label: "Leads" },
  { tool: "crm", label: "Clients" },
  { tool: "tasks", label: "Tasks" },
  { tool: "quotations", label: "Quotations" },
  { tool: "orders", label: "Orders" },
  { tool: "challans", label: "Challans" },
  { tool: "invoices", label: "Invoices" },
  { tool: "payments", label: "Payments" },
  { tool: "catalog", label: "Catalog" },
  { tool: "photoshoot", label: "Photoshoot" },
  { tool: "inventory", label: "Inventory" },
  { tool: "purchase-orders", label: "Purchase orders" },
  { tool: "finance", label: "Finance" },
  { tool: "expenses", label: "Expenses" },
  { tool: "hr", label: "HR" },
  { tool: "users", label: "Team & access" },
];
export function toolUrl(tool: string): string {
  return `https://${tool}${SUITE_DOMAIN}`;
}
export function adminUrl(path = ""): string {
  return `https://admin${SUITE_DOMAIN}${path}`;
}
