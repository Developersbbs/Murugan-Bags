"use client";

import StockTable from "./Table";
import { getColumns, skeletonColumns } from "./columns";
import TableSkeleton from "@/components/shared/table/TableSkeleton";
import { RowSelectionProps } from "@/types/data-table";
import { useAuthorization } from "@/hooks/use-authorization";

interface AllStockProps extends RowSelectionProps {
  stock?: any[];
  pagination?: {
    pages: number;
    current: number;
    prev: number | null;
    next: number | null;
    limit: number;
    items: number;
  };
  isLoading?: boolean;
  isError?: boolean;
  refetch?: () => void;
}

export default function AllStock({
  rowSelection,
  setRowSelection,
  stock = [],
  pagination,
  isLoading = false,
  isError = false,
  refetch,
}: AllStockProps) {
  const { hasPermission } = useAuthorization();
  const columns = getColumns({ hasPermission });

  if (isLoading)
    return <TableSkeleton perPage={pagination?.limit || 10} columns={skeletonColumns} />;

  // Check if this is a legitimate empty state (no stock)
  const isEmptyState = !stock || stock.length === 0;

  if (isEmptyState) {
    return (
      <div className="rounded-md border border-gray-200 overflow-hidden">
        <div className="px-4 py-12 min-h-60 text-center grid place-items-center">
          <div className="flex flex-col items-center gap-4 text-gray-500">
            <svg className="size-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No stock found</h3>
              <p className="text-sm text-gray-500">
                Get started by adding stock entries for your products.
              </p>
            </div>

          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md border-destructive border-2 overflow-hidden">
        <div className="px-4 py-12 min-h-60 text-center grid place-items-center">
          <div className="flex flex-col items-center gap-4 text-destructive">
            <svg className="size-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>

            <p>Something went wrong while trying to fetch stock.</p>

            {refetch && (
              <button
                onClick={() => refetch()}
                className="py-3 px-8 mt-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md"
              >
                <svg className="size-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <StockTable
      columns={columns}
      data={stock}
      pagination={pagination || {
        pages: 0,
        current: 1,
        prev: null,
        next: null,
        limit: 10,
        items: 0,
      }}
      rowSelection={rowSelection}
      setRowSelection={setRowSelection}
    />
  );
}
