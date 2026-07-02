import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  allowedDevOrigins: ["admin.maplefurnishers.com", "leads.maplefurnishers.com", "crm.maplefurnishers.com", "quotations.maplefurnishers.com", "orders.maplefurnishers.com", "challans.maplefurnishers.com", "invoices.maplefurnishers.com", "payments.maplefurnishers.com", "catalog.maplefurnishers.com", "photoshoot.maplefurnishers.com", "inventory.maplefurnishers.com", "purchase-orders.maplefurnishers.com", "finance.maplefurnishers.com", "expenses.maplefurnishers.com", "hr.maplefurnishers.com", "users.maplefurnishers.com"], transpilePackages: ["@maple/core", "@maple/db"] };
export default nextConfig;
