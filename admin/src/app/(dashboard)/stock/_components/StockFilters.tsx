"use client";

import { useState, useEffect } from "react";
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

  // Update URL when debounced search term or stock filter changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }
    
    // Update stock filter
    if (stockFilter === "low") {
      params.set("lowStock", "true");
    } else {
      params.delete("lowStock");
    }
    
    // Reset to first page when filters change
    params.set("page", "1");
    
    // Update URL
    router.push(`/stock?${params.toString()}`);
  }, [debouncedSearch, stockFilter, router, searchParams]);

  // Clear search
  const handleClearSearch = () => {
    setSearch("");
  };

  // Check if any filters are active
  const hasActiveFilters = searchParams.get("search") || 
    searchParams.get("category") || 
    searchParams.get("subcategory") || 
    searchParams.get("productType") ||
    searchParams.get("lowStock") === "true";

  // Handle stock filter change
  const handleStockFilterChange = (value: string) => {
    setStockFilter(value as "all" | "low");
  };

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