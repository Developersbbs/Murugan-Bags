"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

export default function CustomerFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const debouncedSearch = useDebounce(search, 300); // 300ms delay

  // Update URL when debounced search term changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }
    
    // Always reset to first page when search changes
    params.set("page", "1");
    
    // Update URL
    router.push(`/customers?${params.toString()}`);
  }, [debouncedSearch, router, searchParams]);

  return (
    <Card className="mb-5">
      <div className="p-4">
        <Input
          type="search"
          placeholder="Search by name, phone or email"
          className="h-12 w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </Card>
  );
}