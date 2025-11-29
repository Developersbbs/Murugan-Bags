import React, { useEffect } from "react";
import { useFieldArray, Control, useWatch, UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormTextInput } from "@/components/shared/form";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { CategoryFormData } from "./schema";

type SubcategoryListProps = {
  control: Control<CategoryFormData>;
  form?: UseFormReturn<CategoryFormData>;
};

function generateSimpleSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

export function SubcategoryList({ control, form }: SubcategoryListProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "subcategories",
  });

  // Watch for changes in subcategories
  const subcategories = useWatch({
    control,
    name: "subcategories",
    defaultValue: [],
  });

  console.log('SubcategoryList fields:', fields);
  console.log('SubcategoryList watched subcategories:', subcategories);
  console.log('SubcategoryList form available:', !!form);

  // Initialize fields with existing subcategories if form is reset
  useEffect(() => {
    const currentLength = fields.length;
    const dataLength = subcategories.length;

    console.log('useEffect - current fields length:', currentLength, 'data length:', dataLength);

    if (dataLength > 0 && currentLength === 0) {
      // Form was reset with initial data, populate the fields
      console.log('Populating fields with initial subcategories:', subcategories);
      subcategories.forEach(subcat => {
        append(subcat);
      });
    }
  }, [subcategories, fields.length, append]);

  const addSubcategory = () => {
    console.log('Adding subcategory - before append:', {
      fieldsLength: fields.length,
      subcategoriesLength: subcategories.length
    });

    append({
      name: "",
      description: "",
      slug: "",
    });

    console.log('Adding subcategory - after append');
  };

  // Allow deleting subcategories - users can delete any subcategory they want
  const canDeleteSubcategory = (index: number) => {
    // Always allow deletion - users should be able to remove any subcategory
    const canDelete = true;

    console.log(`canDeleteSubcategory(${index}):`, {
      fieldsLength: fields.length,
      canDelete
    });

    return canDelete;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Subcategories</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSubcategory}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Subcategory
        </Button>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="relative space-y-4 rounded-lg border p-4"
          >
            {/* Header with action buttons */}
            <div className="flex justify-end mb-2">
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={addSubcategory}
                  title="Add subcategory"
                >
                  <Plus className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={!canDeleteSubcategory(index)}
                  title={!canDeleteSubcategory(index) ? "Cannot delete the only subcategory" : "Delete subcategory"}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              <FormTextInput
                control={control}
                name={`subcategories.${index}.name`}
                label="Name"
                placeholder="Subcategory Name"
              />

              <FormTextInput
                control={control}
                name={`subcategories.${index}.description`}
                label="Description"
                placeholder="Subcategory Description"
              />
<FormField
  control={control}
  name={`subcategories.${index}.slug`}
  render={({ field }) => (
    <FormItem className="flex flex-col md:flex-row md:gap-x-4 md:space-y-0">
      <FormLabel className="md:flex-shrink-0 md:w-1/4 md:mt-2 leading-snug">
        Slug
      </FormLabel>

      <div className="space-y-2 w-full">
        <FormControl>
          <div className="relative">
            <Input
              type="text"
              className="h-12 pr-[6.75rem] sm:pr-32"
              placeholder="subcategory-slug"
              {...field}
            />

            <Button
              type="button"
              variant="secondary"
              className="absolute top-0 right-0 border border-input px-6 h-12 w-24 sm:w-28 grid place-items-center rounded-none rounded-r-md flex-shrink-0"
              onClick={() => {
                if (form) {
                  const sourceValue = form.getValues(`subcategories.${index}.name`);
                  if (sourceValue && typeof sourceValue === "string") {
                    const generatedSlug = generateSimpleSlug(sourceValue);
                    form.setValue(`subcategories.${index}.slug`, generatedSlug, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }
                }
              }}
            >
              Generate
            </Button>
          </div>
        </FormControl>

        <FormMessage />
      </div>
    </FormItem>
  )}
/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SubcategoryList;