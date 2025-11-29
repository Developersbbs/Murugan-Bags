"use client";

import { getCoreRowModel, useReactTable } from "@tanstack/react-table";

import DataTable from "@/components/shared/table/DataTable";
import { DataTableWithRowSelectionProps } from "@/types/data-table";
import { Product } from "@/services/products/types";

// Type for transformed product data (includes variants as separate rows)
type TransformedProduct = Product & {
  _isVariant?: boolean;
  _variantIndex?: number;
  _variantData?: any;
  _originalProductId?: string;
  _parentProduct?: Product;
};

export default function ProductsTable({
  data,
  columns,
  pagination,
  rowSelection,
  setRowSelection,
}: DataTableWithRowSelectionProps<TransformedProduct>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    state: {
      rowSelection,
    },
    onRowSelectionChange: (updater) => {
      const newSelectionState =
        typeof updater === "function" ? updater(rowSelection) : updater;

      setRowSelection(newSelectionState);
    },
  });

  return <DataTable
  table={table}
  pagination={{
    pages: pagination.pages,
    current: pagination.current,
    prev: pagination.prev,
    next: pagination.next,
    limit: pagination.limit,
    items: pagination.items,
  }}
/>
;
}
