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

  const pushFiltersToURL = useCallback(
    (newSearch: string) => {
      const params = new URLSearchParams(window.location.search);

      if (newSearch) {
        params.set("search", newSearch);
      } else {
        params.delete("search");
      }

      params.set("page", "1");
      router.push(`/customers?${params.toString()}`);
    },
    [router]
  );

  // Update URL only when debounced search term changes
  useEffect(() => {
    const currentSearch = searchParams.get("search") || "";
    if (debouncedSearch !== currentSearch) {
      pushFiltersToURL(debouncedSearch);
    }
  }, [debouncedSearch, pushFiltersToURL, searchParams]);

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