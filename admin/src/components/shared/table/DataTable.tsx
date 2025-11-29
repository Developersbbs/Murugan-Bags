"use client";

import * as React from "react";
import { Table as TableType, flexRender } from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import Typography from "@/components/ui/typography";
import { Pagination as PaginationType } from "@/types/pagination";
import { useUpdateQueryString } from "@/hooks/use-update-query-string";
import { getPaginationButtons } from "@/helpers/getPaginationButtons";

interface DataTableProps<TData> {
  table: TableType<TData>;
  pagination: PaginationType;
}

export default function DataTable<TData>({
  table,
  pagination,
}: DataTableProps<TData>) {
  const updateQueryString = useUpdateQueryString({ scroll: false });
  
  // Guard against invalid pagination data
  const safePagination = {
    pages: pagination?.pages || 0,
    current: pagination?.current || 1,
    prev: pagination?.prev || null,
    next: pagination?.next || null,
    limit: pagination?.limit || 10,
    items: pagination?.items || 0,
  };

  // Early return if table is not properly initialized
  if (!table || typeof table.getRowModel !== 'function') {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
          <p className="text-gray-600">Initializing table...</p>
        </div>
      </div>
    );
  }

  const paginationButtons = getPaginationButtons({
    totalPages: safePagination.pages,
    currentPage: safePagination.current,
  });

  const handlePaginationButton = (page: number) => {
    updateQueryString("page", page.toString());
  };

  const handlePaginationPrev = () => {
    if (safePagination.prev) {
      updateQueryString("page", safePagination.prev.toString());
    }
  };

  const handlePaginationNext = () => {
    if (safePagination.next) {
      updateQueryString("page", safePagination.next.toString());
    }
  };

  // Safe function to get table data
  const getTableRows = () => {
    try {
      const rowModel = table.getRowModel();
      return rowModel?.rows || [];
    } catch (error) {
      console.error("Error getting table rows:", error);
      return [];
    }
  };

  const rows = getTableRows();

  return (
    <div className="rounded-md border overflow-hidden">
      {/* data table */}
      <Table>
        <TableHeader className="bg-popover">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead
                    key={header.id}
                    className="uppercase whitespace-nowrap"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {(() => {
            if (!Array.isArray(rows)) {
              return (
                <TableRow>
                  <TableCell
                    colSpan={table.getAllColumns()?.length || 1}
                    className="h-32 text-center"
                  >
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
                      <p className="text-gray-600">Loading data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              );
            }

            if (rows.length === 0) {
              return (
                <TableRow>
                  <TableCell
                    colSpan={table.getAllColumns()?.length || 1}
                    className="h-32 text-center"
                  >
                    <div className="text-center">
                      <p className="text-gray-600">No results found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              );
            }

            return rows.map((row) => {
              // Safe check for row selection
              let isSelected = false;
              try {
                isSelected = row.getIsSelected ? row.getIsSelected() : false;
              } catch (error) {
                console.warn("Error checking row selection:", error);
                isSelected = false;
              }

              return (
                <TableRow
                  key={row.id}
                  data-state={isSelected ? "selected" : undefined}
                  className="hover:bg-transparent"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              );
            });
          })()}
        </TableBody>
      </Table>

      {/* pagination */}
      {safePagination.items > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-3.5 p-4 bg-popover text-muted-foreground">
          <Typography className="text-sm flex-shrink-0 uppercase font-medium">
            Showing{" "}
            {Math.max((safePagination.current - 1) * safePagination.limit + 1, 1)} to{" "}
            {Math.min(safePagination.current * safePagination.limit, safePagination.items)}{" "}
            of {safePagination.items}
          </Typography>

          <Pagination>
            <PaginationContent className="flex-wrap">
              <PaginationItem>
                <PaginationPrevious
                  onClick={handlePaginationPrev}
                  disabled={!safePagination.prev}
                />
              </PaginationItem>

              {paginationButtons.map((page, index) => (
                <PaginationItem key={`page-${index}`}>
                  {page === "..." ? (
                    <PaginationEllipsis />
                  ) : (
                    <PaginationLink
                      onClick={() => handlePaginationButton(page)}
                      isActive={page === safePagination.current}
                    >
                      {page}
                    </PaginationLink>
                  )}
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={handlePaginationNext}
                  disabled={!safePagination.next}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}