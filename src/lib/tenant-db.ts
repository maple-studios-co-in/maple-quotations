import "server-only";
import { prisma } from "./prisma";
import { getTenantId } from "./tenant";

const SCOPED = new Set([
  "Client","Lead","Quotation","Invoice","Payment","Order","InventoryItem","FinanceEntry",
  "HrDocument","Product","Collection","Shoot","PurchaseOrder","DeliveryChallan","Expense",
  "Task","Doc","User","Role","SitePage","SiteBlock",
]);

/** A Prisma client bound to the current request's tenant. findMany/findFirst/count are
 *  filtered by tenantId; create stamps it; updateMany/deleteMany are filtered.
 *  (Single update/delete by unique id should be preceded by a scoped findFirst guard.) */
export async function tenantDb() {
  const tenantId = await getTenantId();
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) { if (SCOPED.has(model)) args.where = { ...args.where, tenantId }; return query(args); },
        async findFirst({ model, args, query }) { if (SCOPED.has(model)) args.where = { ...args.where, tenantId }; return query(args); },
        async count({ model, args, query }) { if (SCOPED.has(model)) args.where = { ...args.where, tenantId }; return query(args); },
        async updateMany({ model, args, query }) { if (SCOPED.has(model)) args.where = { ...args.where, tenantId }; return query(args); },
        async deleteMany({ model, args, query }) { if (SCOPED.has(model)) args.where = { ...args.where, tenantId }; return query(args); },
        async create({ model, args, query }) { if (SCOPED.has(model) && args.data && !Array.isArray(args.data)) (args.data as Record<string, unknown>).tenantId = tenantId; return query(args); },
        async upsert({ model, args, query }) { if (SCOPED.has(model) && args.create && !Array.isArray(args.create)) (args.create as Record<string, unknown>).tenantId = tenantId; return query(args); },
      },
    },
  });
}
