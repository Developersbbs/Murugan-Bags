"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Control, FieldValues, Path, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { X, Plus, Edit, Check, X as XIcon } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { fetchCategoriesDropdown } from "@/services/categories";
import FetchDropdownContainer from "@/components/shared/FetchDropdownContainer";
import axiosInstance from "@/helpers/axiosInstance";

type CategorySubcategorySelection = {
  category: string;
  categoryName?: string;
  subcategoryIds: string[];
  subcategoryNames?: string[];
};

type FormMultipleCategorySubcategoryInputProps<TFormData extends FieldValues> = {
  control: Control<TFormData>;
  name: Path<TFormData>;
  setValue: UseFormSetValue<TFormData>;
  watch: UseFormWatch<TFormData>;
  container?: HTMLDivElement;
};

export default function FormMultipleCategorySubcategoryInput<TFormData extends FieldValues>({
  control,
  name,
  setValue,
  watch,
  container,
}: FormMultipleCategorySubcategoryInputProps<TFormData>) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingSubcategoryIds, setEditingSubcategoryIds] = useState<string[]>([]);

  // Ensure we handle both category and categoryId for robustness
  const rawSelections = watch(name) as any[] || [];

  // Debug logging
  if (rawSelections.length > 0) {
    console.log('FormMultipleCategorySubcategoryInput raw selections:', rawSelections);
  }

  const currentSelections = rawSelections
    .map(selection => {
      const categoryId = selection.category || selection.categoryId;
      if (!categoryId) return null;

      return {
        ...selection,
        category: categoryId
      };
    })
    .filter(Boolean) as CategorySubcategorySelection[];

  // Debug: Log the current form value
  console.log('Current form value for categories:', currentSelections);

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

  // Fetch subcategories for editing
  const {
    data: editingSubcategories,
    isLoading: editingSubcategoriesLoading,
  } = useQuery({
    queryKey: ["subcategories", editingIndex !== null ? currentSelections[editingIndex]?.category : null],
    queryFn: async () => {
      if (editingIndex === null || !currentSelections[editingIndex]) return [];
      const categoryId = currentSelections[editingIndex].category;
      const { data } = await axiosInstance.get(`/api/categories/${categoryId}`);
      return data.data.subcategories || [];
    },
    enabled: editingIndex !== null,
    staleTime: 5 * 60 * 1000,
  });

  const handleAddSelection = () => {
    if (!selectedCategoryId) return;

    const category = categories?.find((c) => c._id === selectedCategoryId);
    const selectedSubcategories = subcategories?.filter((s: any) =>
      selectedSubcategoryIds.includes(s._id)
    );

    const newSelection: CategorySubcategorySelection = {
      category: selectedCategoryId,
      categoryName: category?.name,
      subcategoryIds: selectedSubcategoryIds,
      subcategoryNames: selectedSubcategories?.map((s: any) => s.name) || [],
    };

    console.log('Adding selection:', newSelection);
    const updatedSelections = [...currentSelections, newSelection];
    console.log('Updated selections:', updatedSelections);
    setValue(name, updatedSelections as any, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    // Reset selection
    setSelectedCategoryId("");
    setSelectedSubcategoryIds([]);
  };

  const handleRemoveSelection = (index: number) => {
    const updatedSelections = currentSelections.filter((_, i) => i !== index);
    setValue(name, updatedSelections as any);
  };

  const handleEditSelection = (index: number) => {
    const selection = currentSelections[index];
    setEditingIndex(index);
    setEditingSubcategoryIds([...selection.subcategoryIds]);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    const selection = currentSelections[editingIndex];
    const category = categories?.find((c) => c._id === selection.category);
    const editedSubcategories = editingSubcategories?.filter((s: any) =>
      editingSubcategoryIds.includes(s._id)
    );

    const updatedSelection: CategorySubcategorySelection = {
      ...selection,
      subcategoryIds: editingSubcategoryIds,
      subcategoryNames: editedSubcategories?.map((s: any) => s.name) || [],
    };

    const updatedSelections = [...currentSelections];
    updatedSelections[editingIndex] = updatedSelection;
    setValue(name, updatedSelections as any);

    // Reset editing state
    setEditingIndex(null);
    setEditingSubcategoryIds([]);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingSubcategoryIds([]);
  };

  const handleToggleSubcategory = (subcategoryId: string) => {
    setSelectedSubcategoryIds((prev) =>
      prev.includes(subcategoryId)
        ? prev.filter((id) => id !== subcategoryId)
        : [...prev, subcategoryId]
    );
  };

  const handleToggleEditingSubcategory = (subcategoryId: string) => {
    setEditingSubcategoryIds((prev) =>
      prev.includes(subcategoryId)
        ? prev.filter((id) => id !== subcategoryId)
        : [...prev, subcategoryId]
    );
  };

  return (
    <FormField
      control={control}
      name={name}
      render={() => (
        <FormItem className="flex flex-col md:flex-row md:gap-x-4 md:space-y-0">
          <FormLabel className="md:flex-shrink-0 md:w-1/4 md:mt-2 leading-snug">
            Categories
          </FormLabel>

          <div className="space-y-6 w-full">
            {/* Display selected categories and subcategories */}
            {currentSelections.length > 0 && (
              <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                {currentSelections.map((selection, index) => (
                  <div key={index} className="flex items-start justify-between gap-2 p-3 bg-background rounded border">
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-2">{selection.categoryName}</div>

                      {editingIndex === index ? (
                        // Edit mode
                        <div className="space-y-2">
                          {editingSubcategoriesLoading ? (
                            <div className="text-sm text-muted-foreground">Loading subcategories...</div>
                          ) : editingSubcategories && editingSubcategories.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/20">
                              {editingSubcategories.map((subcategory: any) => (
                                <label
                                  key={subcategory._id}
                                  className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                                >
                                  <input
                                    type="checkbox"
                                    checked={editingSubcategoryIds.includes(subcategory._id)}
                                    onChange={() => handleToggleEditingSubcategory(subcategory._id)}
                                    className="h-4 w-4"
                                  />
                                  <span className="text-sm">{subcategory.name}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground p-3 border rounded-lg text-center">
                              No subcategories available for this category
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleSaveEdit}
                              className="h-8"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                              className="h-8"
                            >
                              <XIcon className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <div className="flex flex-wrap gap-1">
                          {selection.subcategoryNames?.map((name, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {editingIndex === index ? (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleSaveEdit}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="h-8 w-8 p-0"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSelection(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSelection(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Category Selection */}
            <div className="space-y-2">
              <Select
                value={selectedCategoryId}
                onValueChange={(value) => {
                  setSelectedCategoryId(value);
                  setSelectedSubcategoryIds([]);
                }}
              >
                <FormControl>
                  <SelectTrigger>
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
                      categories
                        .filter((category) => !currentSelections.some((selection) => selection.category === category._id))
                        .map((category) => (
                          <SelectItem key={category._id} value={category._id}>
                            {category.name}
                          </SelectItem>
                        ))}
                    {!categoriesLoading &&
                      !categoriesError &&
                      categories &&
                      categories.filter((category) => !currentSelections.some((selection) => selection.category === category._id))
                        .length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          All categories have been selected
                        </div>
                      )}
                  </FetchDropdownContainer>
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory Multi-Selection */}
            {selectedCategoryId && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Select Subcategories:</div>
                {subcategoriesLoading ? (
                  <div className="text-sm text-muted-foreground">Loading subcategories...</div>
                ) : subcategoriesError ? (
                  <div className="text-sm text-destructive">Failed to load subcategories</div>
                ) : subcategories && subcategories.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg">
                    {subcategories.map((subcategory: any) => (
                      <label
                        key={subcategory._id}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubcategoryIds.includes(subcategory._id)}
                          onChange={() => handleToggleSubcategory(subcategory._id)}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">{subcategory.name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground p-3 border rounded-lg text-center">
                    No subcategories available for this category
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleAddSelection}
                  className="w-full"
                  variant={selectedSubcategoryIds.length > 0 ? "outline" : "secondary"}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {selectedSubcategoryIds.length > 0
                    ? `Add Category with ${selectedSubcategoryIds.length} Subcategor${selectedSubcategoryIds.length === 1 ? 'y' : 'ies'}`
                    : "Add Category without subcategories"}
                </Button>
                {currentSelections.length === 0 && (
                  <p className="text-xs text-amber-600 font-medium text-center animate-pulse">
                    ⚠️ You must click the button above to add this category to the product.
                  </p>
                )}
              </div>
            )}

            <FormMessage />
          </div>
        </FormItem>
      )}
    />
  );
}
