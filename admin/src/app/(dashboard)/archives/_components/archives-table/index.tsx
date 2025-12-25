"use client";

import { useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import ProductsTable from "@/app/(dashboard)/products/_components/products-table/Table";
import { getColumns, skeletonColumns } from "./columns";
import { transformProductsForTable } from "@/app/(dashboard)/products/_components/products-table/columns";
import TableSkeleton from "@/components/shared/table/TableSkeleton";
import TableError from "@/components/shared/table/TableError";

import { RowSelectionProps } from "@/types/data-table";
import { useAuthorization } from "@/hooks/use-authorization";

interface AllProductsProps extends RowSelectionProps {
    products?: any[];
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

export default function ArchivesTable({
    rowSelection = {},
    setRowSelection = () => { },
    products = [],
    pagination,
    isLoading = false,
    isError = false,
    refetch,
}: AllProductsProps) {
    const { hasPermission } = useAuthorization();
    const columns = getColumns({ hasPermission });

    // Transform products data to show variants as separate rows
    const transformedProducts = transformProductsForTable(products);

    if (isLoading)
        return <TableSkeleton perPage={pagination?.limit || 10} columns={skeletonColumns} />;

    // Check if this is a legitimate empty state (no products)
    const isEmptyState = !products || products.length === 0;

    if (isEmptyState) {
        return (
            <div className="rounded-md border border-gray-200 overflow-hidden">
                <div className="px-4 py-12 min-h-60 text-center grid place-items-center">
                    <div className="flex flex-col items-center gap-4 text-gray-500">
                        <svg className="size-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>

                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">No archived products</h3>
                            <p className="text-sm text-gray-500">
                                Archived products will appear here.
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

                        <p>Something went wrong while trying to fetch archived products.</p>

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
        <ProductsTable
            columns={columns}
            data={transformedProducts}
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
