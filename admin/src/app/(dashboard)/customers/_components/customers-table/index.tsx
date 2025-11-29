"use client";

import { useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import CustomersTable from "./Table";
import { getColumns, skeletonColumns } from "./columns";
import TableSkeleton from "@/components/shared/table/TableSkeleton";
import TableError from "@/components/shared/table/TableError";

import { getSearchParams } from "@/helpers/getSearchParams";
import { fetchCustomers } from "@/services/customers";
import { useAuthorization } from "@/hooks/use-authorization";

export default function AllCustomers() {
  const { hasPermission } = useAuthorization();
  const columns = getColumns({ hasPermission });
  const { page, limit, search } = getSearchParams(useSearchParams());

  const {
    data: customers,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["customers", page, limit, search],
    queryFn: () =>
      fetchCustomers({ page, limit, search }),
    placeholderData: keepPreviousData,
  });

  if (isLoading)
    return <TableSkeleton perPage={limit} columns={skeletonColumns} />;

  if (isError || !customers)
    return (
      <TableError
        errorMessage="Something went wrong while trying to fetch customers."
        refetch={refetch}
      />
    );

  return (
    <CustomersTable
      columns={columns}
      data={customers?.data || []}
      pagination={{
        limit: customers?.meta?.limit ?? limit,
        current: customers?.meta?.page ?? page,
        items: customers?.meta?.total ?? 0,
        pages: customers?.meta?.totalPages ?? 0,
        next: (customers?.meta?.page ?? page) < (customers?.meta?.totalPages ?? 0) ? (customers?.meta?.page ?? page) + 1 : null,
        prev: (customers?.meta?.page ?? page) > 1 ? (customers?.meta?.page ?? page) - 1 : null,
      }}
    />
  );
}
