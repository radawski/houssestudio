import type { Metadata } from "next";

import { CustomerList } from "@/app/admin/clientes/customer-list";
import { AddCustomerSheet } from "@/app/admin/mas/add-customer-sheet";
import { BackHeader } from "@/components/admin/back-header";
import { getCustomerList } from "@/lib/data/customers";

export const metadata: Metadata = { title: "Clientes" };

/**
 * Más → Clientes (plan de noviembre, C1): todos los clientes con buscador,
 * los que vinieron hace menos primero. "Agregar cliente" se mudó acá desde
 * Más.
 */
export default async function CustomersPage() {
  const customers = await getCustomerList();

  return (
    <div className="space-y-3.5 md:space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <BackHeader title="Clientes" />
          <h1 className="hidden text-xl font-semibold md:block">Clientes</h1>
          <p className="text-muted-foreground hidden text-sm md:block">Fichas, historial y faltas.</p>
        </div>
        <AddCustomerSheet variant="button" />
      </div>

      <CustomerList customers={customers} />
    </div>
  );
}
