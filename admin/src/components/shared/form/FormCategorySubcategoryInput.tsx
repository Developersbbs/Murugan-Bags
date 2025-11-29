"use client";

import { forwardRef, Ref, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Control, FieldValues, Path, UseFormSetValue } from "react-hook-form";

import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { fetchCategoriesDropdown } from "@/services/categories";
import FetchDropdownContainer from "@/components/shared/FetchDropdownContainer";
import axiosInstance from "@/helpers/axiosInstance";

type FormCategorySubcategoryInputProps<TFormData extends FieldValues> = {
  control: Control<TFormData>;
  categoryName: Path<TFormData>;
  subcategoryName: Path<TFormData>;
  setValue: UseFormSetValue<TFormData>;
  container?: HTMLDivElement;
};

const FormCategorySubcategoryInput = forwardRef(function FormCategorySubcategoryInputRender<
  TFormData extends FieldValues
>(
  { control, categoryName, subcategoryName, setValue, container }: FormCategorySubcategoryInputProps<TFormData>,
  ref: Ref<HTMLButtonElement>
) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  // Fetch categories
  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useQuery({
    queryKey: ["categories", "dropdown"],
    queryFn: () => fetchCategoriesDropdown(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch subcategories for selected category
  const {
    data: subcategories,
    isLoading: subcategoriesLoading,
    isError: subcategoriesError,
  } = useQuery({
    queryKey: ["subcategories", selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return [];
      const { data } = await axiosInstance.get(`/api/categories/${selectedCategoryId}`);
      return data.data.subcategories || [];
    },
    enabled: !!selectedCategoryId,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <>
      {/* Category Selection */}
      <FormField
        control={control}
        name={categoryName}
        render={({ field }) => (
          <FormItem className="flex flex-col md:flex-row md:gap-x-4 md:space-y-0">
            <FormLabel className="md:flex-shrink-0 md:w-1/4 md:mt-2 leading-snug">
              Category
            </FormLabel>

            <div className="space-y-2 w-full">
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  setSelectedCategoryId(value);
                  // Reset subcategory when category changes
                  setValue(subcategoryName, "" as any);
                }}
              >
                <FormControl>
                  <SelectTrigger ref={ref} className="md:basis-1/5">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                </FormControl>

                <SelectContent portalContainer={container}>
                  <FetchDropdownContainer
                    isLoading={categoriesLoading}
                    isError={categoriesError}
                    errorMessage="Failed to load categories"
                  >
                    {!categoriesLoading &&
                      !categoriesError &&
                      categories &&
                      categories.map((category) => (
                        <SelectItem key={category._id} value={category._id}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </FetchDropdownContainer>
                </SelectContent>
              </Select>

              <FormMessage />
            </div>
          </FormItem>
        )}
      />

      {/* Subcategory Selection */}
      <FormField
        control={control}
        name={subcategoryName}
        render={({ field }) => (
          <FormItem className="flex flex-col md:flex-row md:gap-x-4 md:space-y-0">
            <FormLabel className="md:flex-shrink-0 md:w-1/4 md:mt-2 leading-snug">
              Subcategory
            </FormLabel>

            <div className="space-y-2 w-full">
              <Select
                value={field.value}
                onValueChange={(value) => field.onChange(value)}
                disabled={!selectedCategoryId}
              >
                <FormControl>
                  <SelectTrigger className="md:basis-1/5">
                    <SelectValue 
                      placeholder={
                        !selectedCategoryId 
                          ? "Select category first" 
                          : "Select Subcategory"
                      } 
                    />
                  </SelectTrigger>
                </FormControl>

                <SelectContent portalContainer={container}>
                  <FetchDropdownContainer
                    isLoading={subcategoriesLoading}
                    isError={subcategoriesError}
                    errorMessage="Failed to load subcategories"
                  >
                    {!subcategoriesLoading &&
                      !subcategoriesError &&
                      subcategories &&
                      subcategories.length > 0 ? (
                        subcategories.map((subcategory: any) => (
                          <SelectItem key={subcategory._id} value={subcategory._id}>
                            {subcategory.name}
                          </SelectItem>
                        ))
                      ) : (
                        !subcategoriesLoading && (
                          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                            No subcategories available
                          </div>
                        )
                      )}
                  </FetchDropdownContainer>
                </SelectContent>
              </Select>

              <FormMessage />
            </div>
          </FormItem>
        )}
      />
    </>
  );
}) as <TFormData extends FieldValues>(
  props: FormCategorySubcategoryInputProps<TFormData> & { ref?: Ref<HTMLButtonElement> }
) => React.ReactElement;

export default FormCategorySubcategoryInput;
