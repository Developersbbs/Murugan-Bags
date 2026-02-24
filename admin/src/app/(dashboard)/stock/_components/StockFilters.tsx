"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function StockFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [stockFilter, setStockFilter] = useState<"all" | "low">(
    searchParams.get("stockFilter") === "low" ? "low" : "all"
  );
  const debouncedSearch = useDebounce(search, 300);

  const pushFiltersToURL = useCallback(
    (newSearch: string, newStockFilter: "all" | "low") => {
      const params = new URLSearchParams(window.location.search);

      if (newSearch) {
        params.set("search", newSearch);
      } else {
        params.delete("search");
      }

      if (newStockFilter === "low") {
        params.set("lowStock", "true");
      } else {
        params.delete("lowStock");
      }

      params.set("page", "1");
      router.push(`/stock?${params.toString()}`);
    },
    [router]
  );

  // Update URL only when debounced search term changes
  useEffect(() => {
    const currentSearch = searchParams.get("search") || "";
    if (debouncedSearch !== currentSearch) {
      pushFiltersToURL(debouncedSearch, stockFilter);
    }
  }, [debouncedSearch, pushFiltersToURL, stockFilter, searchParams]);

  // Handle stock filter change
  const handleStockFilterChange = (value: string) => {
    const newVal = (value as "all" | "low") || "all";
    setStockFilter(newVal);
    pushFiltersToURL(search, newVal);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearch("");
    pushFiltersToURL("", stockFilter);
  };

  // Check if any filters are active
  const hasActiveFilters = searchParams.get("search") ||
    searchParams.get("category") ||
    searchParams.get("subcategory") ||
    searchParams.get("productType") ||
    searchParams.get("lowStock") === "true";


  // Clear all filters
  const handleClearAllFilters = () => {
    setSearch("");
    setStockFilter("all");
    router.push("/stock?page=1&limit=10");
  };

  return (
    <Card className="mb-5">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search by product name, SKU, or variant..."
              className="h-12 w-full pl-10 pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <ToggleGroup
              type="single"
              value={stockFilter}
              onValueChange={handleStockFilterChange}
              className="bg-muted p-1 rounded-md"
            >
              <ToggleGroupItem
                value="all"
                className={`px-4 py-2 rounded-md ${stockFilter === 'all' ? 'bg-white shadow-sm' : 'hover:bg-transparent'}`}
              >
                All Stock
              </ToggleGroupItem>
              <ToggleGroupItem
                value="low"
                className={`px-4 py-2 rounded-md ${stockFilter === 'low' ? 'bg-white shadow-sm text-red-600' : 'hover:bg-transparent'}`}
              >
                Low Stock
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>
    </Card>
  );
}