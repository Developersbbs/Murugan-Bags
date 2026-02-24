"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function CategoryFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search input - wait 500ms after user stops typing
  useEffect(() => {
    if (search !== debouncedSearch) {
      setIsSearching(true);
    }

    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  const pushFiltersToURL = useCallback(
    (newSearch: string) => {
      const params = new URLSearchParams(window.location.search);

      if (newSearch) {
        params.set("search", newSearch);
      } else {
        params.delete("search");
      }

      // Reset to page 1 when search changes
      params.set("page", "1");

      router.replace(`/categories?${params.toString()}`);
    },
    [router]
  );

  // Update URL when debounced search changes
  useEffect(() => {
    const currentSearch = searchParams.get("search") || "";
    if (debouncedSearch !== currentSearch) {
      pushFiltersToURL(debouncedSearch);
    }
  }, [debouncedSearch, pushFiltersToURL, searchParams]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }

    params.set("page", "1");
    router.replace(`/categories?${params.toString()}`);
  };

  const handleReset = () => {
    setSearch("");
    router.replace("/categories?page=1&limit=10");
  };

  return (
    <Card className="mb-5">
      <form
        onSubmit={handleFilter}
        className="flex flex-col md:flex-row gap-4 lg:gap-6"
      >
        <div className="relative w-full">
          <Input
            type="search"
            placeholder="Search categories"
            className="h-12"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

      </form>
    </Card>
  );
}
