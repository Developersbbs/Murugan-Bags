"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import ArchivesTable from "./archives-table";
import ArchiveActions from "./ArchiveActions";
import { getSearchParams } from "@/helpers/getSearchParams";
import { fetchProducts } from "@/services/products";

export default function Archives() {
    const [rowSelection, setRowSelection] = useState({});
    const { page, limit, search } = getSearchParams(useSearchParams());

    // Fetch only archived products
    const {
        data: products,
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: [
            "products",
            "archived", // Add 'archived' to query key
            page,
            limit,
            search,
        ],
        queryFn: () =>
            fetchProducts({
                page,
                limit,
                search,
                status: "archived", // Explicitly fetch archived status
            }),
        placeholderData: keepPreviousData,
    });

    return (
        <div className="space-y-4">
            <ArchiveActions
                rowSelection={rowSelection}
                setRowSelection={setRowSelection}
                products={products?.data || []}
            />

            <ArchivesTable
                products={products?.data || []}
                pagination={{
                    pages: products?.totalPages || 0,
                    current: products?.currentPage || 1,
                    prev: products?.prevPage || null,
                    next: products?.nextPage || null,
                    limit: products?.limit || 10,
                    items: products?.totalItems || 0,
                }}
                rowSelection={rowSelection}
                setRowSelection={setRowSelection}
                isLoading={isLoading}
                isError={isError}
                refetch={refetch}
            />
        </div>
    );
}
