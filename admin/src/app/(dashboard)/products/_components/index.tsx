"use client";

import { useState, Fragment } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import ProductActions from "./ProductActions";
import ProductFilters from "./ProductFilters";
import AllProducts from "./products-table";

import { getSearchParams } from "@/helpers/getSearchParams";
import { fetchProducts } from "@/services/products";

export default function Products() {
  const [rowSelection, setRowSelection] = useState({});
  const { page, limit, search, category, subcategory, price, published, status, date, productType } =
    getSearchParams(useSearchParams());

  const {
    data: products,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "products",
      page,
      limit,
      search,
      category,
      subcategory,
      price,
      published,
      status,
      date,
      productType,
    ],
    queryFn: () =>
      fetchProducts({
        page,
        limit,
        search,
        category,
        subcategory,
        priceSort: price as "lowest-first" | "highest-first" | undefined,
        status: status as "selling" | "out-of-stock" | undefined,
        published,
        dateSort: date,
        productType,
      }),
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      // Don't retry on certain types of errors that indicate no data
      if (error?.message?.includes('No products found') || error?.message?.includes('not found')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  return (
    <Fragment>
      <ProductActions
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        products={products?.data || []}
      />
      <ProductFilters />
      <AllProducts
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        products={products?.data || []}
        pagination={{
          pages: products?.totalPages || 0,
          current: products?.currentPage || 1,
          prev: products?.prevPage || null,
          next: products?.nextPage || null,
          limit: products?.limit || 10,
          items: products?.totalItems || 0,
        }}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
      />
    </Fragment>
  );
}
