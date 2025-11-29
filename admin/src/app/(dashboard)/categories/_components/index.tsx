"use client";

import { useState, Fragment, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import AllCategories from "./categories-table";
import CategoryActions from "./CategoryActions";
import CategoryFilters from "./CategoryFilters";
import { fetchCategories } from "@/services/categories";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Categories() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rowSelection, setRowSelection] = useState({});

  // Parse URL parameters with better error handling
  const rawPage = searchParams.get("page");
  const rawLimit = searchParams.get("limit");
  const rawSearch = searchParams.get("search");

  const page = rawPage && !isNaN(Number(rawPage)) ? Math.max(1, parseInt(rawPage)) : 1;
  const limit = rawLimit && !isNaN(Number(rawLimit)) ? Math.max(1, parseInt(rawLimit)) : 10;
  const search = rawSearch || "";

  // Reset row selection when page changes
  useEffect(() => {
    setRowSelection({});
  }, [page]);

  // Create stable query key
  const queryKey = useMemo(() => ["categories", page, limit, search], [page, limit, search]);

  // Fetch categories with search
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => fetchCategories({ page, limit, search }),
    staleTime: 30000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: true,
    retry: 1,
    retryDelay: 1000,
  });

  // Show search results info
  const searchResultsInfo = search && data?.meta ? (
    <div className="mb-4 text-sm text-muted-foreground">
      Found {data.meta.total} result{data.meta.total !== 1 ? 's' : ''} for "{search}"
    </div>
  ) : null;

  return (
    <Fragment>
      <CategoryActions
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
      />
      <CategoryFilters />

      {searchResultsInfo}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load categories: {error instanceof Error ? error.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      ) : data && data.data.length === 0 ? (
        <Alert>
          <AlertDescription>
            {search
              ? `No categories found matching "${search}"`
              : "No categories available"
            }
          </AlertDescription>
        </Alert>
      ) : (
        <AllCategories
          data={data?.data || []}
          meta={data?.meta}
          rowSelection={rowSelection}
          setRowSelection={setRowSelection}
        />
      )}
    </Fragment>
  );
}