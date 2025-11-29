"use client";

import { useState, useEffect, Fragment } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import StockActions from "./_components/StockActions";
import AllStock from "./_components/stock-table/index";

import { fetchStock } from "@/actions/stock";
import StockFilters from "./_components/StockFilters";

export default function Stock() {
  const [rowSelection, setRowSelection] = useState({});
  const searchParams = useSearchParams();
  
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 10;
  const search = searchParams.get('search') || undefined;
  
  // Debug: Log search params
  useEffect(() => {
    console.log('Search params changed:', {
      search,
      page,
      limit,
      allParams: Object.fromEntries(searchParams.entries())
    });
  }, [search, page, limit, searchParams]);
  
  // Add these new params
  const category = searchParams.get('category') || undefined;
  const subcategory = searchParams.get('subcategory') || undefined;
  const productType = searchParams.get('productType') || undefined;
  
  // Add sort params
  const price = searchParams.get('price') || undefined;
  const published = searchParams.get('published') || undefined;
  const status = searchParams.get('status') || undefined;
  const date = searchParams.get('date') || undefined;
  
  const productId = searchParams.get('productId') || undefined;
  const variantId = searchParams.get('variantId') || undefined;
  const lowStock = searchParams.get('lowStock') || undefined;

  const {
    data: stock,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "stock",
      page,
      limit,
      search,
      category,      // Add to queryKey
      subcategory,   // Add to queryKey
      productType,   // Add to queryKey
      price,         // Add to queryKey
      published,     // Add to queryKey
      status,        // Add to queryKey
      date,          // Add to queryKey
      productId,
      variantId,
      lowStock,
    ],
    queryFn: async () => {
      const params: any = {
        page,
        limit,
      };

      // Add search parameter if it exists
      if (search) params.search = search;
      
      // Add other filter parameters
      if (category && category !== 'all') params.category = category;
      if (subcategory && subcategory !== 'all') params.subcategory = subcategory;
      if (productType && productType !== 'all') params.productType = productType;
      if (price) params.price = price;
      if (published) params.published = published;
      if (status) params.status = status;
      if (date) params.date = date;
      if (productId) params.productId = productId;
      if (variantId) params.variantId = variantId;
      if (lowStock) params.lowStock = lowStock === 'true';
      
      console.log('Fetching stock with params:', params);
      try {
        const result = await fetchStock(params);
        console.log('Received stock data:', {
          count: result.data?.length,
          totalItems: result.totalItems,
          firstItem: result.data?.[0]
        });
        return result;
      } catch (error) {
        console.error('Error in fetchStock:', error);
        throw error;
      }
    },
    placeholderData: keepPreviousData,
    retry: (failureCount, error) => {
      if (error?.message?.includes('No stock found') || error?.message?.includes('not found')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  return (
    <Fragment>
      <StockActions
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        stock={stock?.data || []}
      />
      <StockFilters/>
      <AllStock
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        stock={search ? 
          (stock?.data || []).filter(item => 
            item.productId.name.toLowerCase().includes(search.toLowerCase()) ||
            (item.productId.sku && item.productId.sku.toLowerCase().includes(search.toLowerCase())) ||
            (item.variantId && item.variantId.toString().toLowerCase().includes(search.toLowerCase()))
          ) : 
          (stock?.data || [])}
        pagination={{
          pages: search ? 1 : (stock?.totalPages || 0),
          current: search ? 1 : (stock?.currentPage || 1),
          prev: search ? null : (stock?.prevPage || null),
          next: search ? null : (stock?.nextPage || null),
          limit: stock?.limit || 10,
          items: search ? 
            (stock?.data || []).filter(item => 
              item.productId.name.toLowerCase().includes(search.toLowerCase()) ||
              (item.productId.sku && item.productId.sku.toLowerCase().includes(search.toLowerCase())) ||
              (item.variantId && item.variantId.toString().toLowerCase().includes(search.toLowerCase()))
            ).length : 
            (stock?.totalItems || 0),
        }}
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
      />
    </Fragment>
  );
}
