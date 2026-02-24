"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FetchDropdownContainer from "@/components/shared/FetchDropdownContainer";

import { sortToParamsMap, getSortFromParams } from "./sortParams";
import { fetchCategoriesDropdown, fetchSubcategoriesByCategorySlug } from "@/services/categories";
import type { CategoryDropdown } from "@/types/api";

export default function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    subcategory: searchParams.get("subcategory") || "",
    productType: searchParams.get("productType") || "",
    sort: getSortFromParams(searchParams) || "",
  });

  const {
    data: categories,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["categories", "dropdown"],
    queryFn: () => fetchCategoriesDropdown(),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: subcategories,
    isLoading: subcategoriesLoading,
    isError: subcategoriesError,
  } = useQuery({
    queryKey: ["subcategories", filters.category],
    queryFn: () => fetchSubcategoriesByCategorySlug(filters.category),
    enabled: filters.category !== "" && filters.category !== "all",
    staleTime: 5 * 60 * 1000,
  });

  // Build and push a new URL from the given filters.
  // Always resets page to 1 — but this is called ONLY from direct user
  // interactions (dropdowns / search form), never from effects, so
  // pagination-button clicks are never clobbered.
  const pushFiltersToURL = useCallback(
    (currentFilters: typeof filters) => {
      // Start from the live URL so we preserve ?limit etc.
      const params = new URLSearchParams(window.location.search);
      params.set("page", "1");

      if (currentFilters.search) {
        params.set("search", currentFilters.search);
      } else {
        params.delete("search");
      }

      if (currentFilters.category && currentFilters.category !== "all") {
        params.set("category", currentFilters.category);
      } else {
        params.delete("category");
      }

      if (currentFilters.subcategory && currentFilters.subcategory !== "all") {
        params.set("subcategory", currentFilters.subcategory);
      } else {
        params.delete("subcategory");
      }

      if (currentFilters.productType && currentFilters.productType !== "all") {
        params.set("productType", currentFilters.productType);
      } else {
        params.delete("productType");
      }

      if (currentFilters.sort && currentFilters.sort !== "none") {
        const sortConfig = sortToParamsMap[currentFilters.sort];
        if (sortConfig) {
          params.set(sortConfig.key, sortConfig.value);
        }
      } else {
        ["price", "date"].forEach((k) => params.delete(k));
      }

      router.push(`/products?${params.toString()}`);
    },
    [router]
  );

  // Reset subcategory local state when category changes.
  // No URL push here — the category handler already calls pushFiltersToURL.
  useEffect(() => {
    if (filters.category && filters.category !== "all") {
      setFilters((prev) => ({ ...prev, subcategory: "all" }));
    }
  }, [filters.category]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    // Also reset subcategory when category changes
    if (key === "category") {
      newFilters.subcategory = "all";
    }
    setFilters(newFilters);
    pushFiltersToURL(newFilters);
  };

  const handleReset = () => {
    const resetFilters = {
      search: "",
      category: "all",
      subcategory: "all",
      productType: "all",
      sort: "none",
    };
    setFilters(resetFilters);
    router.push("/products");
  };

  return (
    <Card className="mb-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          pushFiltersToURL(filters);
        }}
        className="flex flex-col md:flex-row gap-4 lg:gap-6"
      >
        <Input
          type="search"
          placeholder="Search product..."
          className="h-12 flex-1"
          value={filters.search}
          onChange={(e) => handleFilterChange("search", e.target.value)}
        />

        <Select
          value={filters.category}
          onValueChange={(value) => handleFilterChange("category", value)}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Category" />
          </SelectTrigger>

          <SelectContent>
            <FetchDropdownContainer
              isLoading={isLoading}
              isError={isError}
              errorMessage="Failed to load categories"
            >
              <SelectItem key="all" value="all">
                All Categories
              </SelectItem>

              {!isLoading &&
                !isError &&
                categories &&
                categories!.map((category: CategoryDropdown) => (
                  <SelectItem key={category.slug} value={category.slug}>
                    {category.name}
                  </SelectItem>
                ))}
            </FetchDropdownContainer>
          </SelectContent>
        </Select>

        <Select
          value={filters.subcategory}
          onValueChange={(value) => handleFilterChange("subcategory", value)}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Subcategory" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem key="all" value="all">
              All Subcategories
            </SelectItem>

            {/* Show loading state */}
            {filters.category && filters.category !== "all" && subcategoriesLoading && (
              <SelectItem value="loading" disabled>
                Loading subcategories...
              </SelectItem>
            )}

            {/* Show error state */}
            {filters.category && filters.category !== "all" && subcategoriesError && (
              <SelectItem value="error" disabled>
                Error loading subcategories
              </SelectItem>
            )}

            {/* Show subcategories when loaded */}
            {!subcategoriesLoading && !subcategoriesError && subcategories && subcategories.length > 0 && (
              subcategories.map((subcategory: any) => (
                <SelectItem key={subcategory.slug} value={subcategory.slug}>
                  {subcategory.name}
                </SelectItem>
              ))
            )}

            {/* Show message when no category selected */}
            {(!filters.category || filters.category === "all") && (
              <SelectItem value="no-category" disabled>
                Select category first
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        <Select
          value={filters.productType}
          onValueChange={(value) => handleFilterChange("productType", value)}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Product Type" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="digital">Digital</SelectItem>
            <SelectItem value="physical">Physical</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.sort}
          onValueChange={(value) => handleFilterChange("sort", value)}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="none">No Sort</SelectItem>
            <SelectItem value="lowest-first">Price: Low to High</SelectItem>
            <SelectItem value="highest-first">Price: High to Low</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="unpublished">Unpublished</SelectItem>

            <SelectItem value="date-added-asc">Date Added (Asc)</SelectItem>
            <SelectItem value="date-added-desc">Date Added (Desc)</SelectItem>
            <SelectItem value="date-updated-asc">Date Updated (Asc)</SelectItem>
            <SelectItem value="date-updated-desc">
              Date Updated (Desc)
            </SelectItem>
          </SelectContent>
        </Select>

      </form>
    </Card>
  );
}