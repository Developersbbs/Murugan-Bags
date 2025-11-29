"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FieldErrors } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Form } from "@/components/ui/form";

import {
  FormSheetContent,
  FormSheetBody,
  FormSheetHeader,
  FormSheetFooter,
} from "@/components/shared/form/FormSheet";
import {
  FormTextInput,
  FormImageInput,
  FormSlugInput,
  FormTextarea,
} from "@/components/shared/form";
import { SubcategoryList } from "./SubcategoryList";
import { FormSubmitButton } from "@/components/shared/form/FormSubmitButton";

import { categoryFormSchema, CategoryFormData } from "./schema";
import { objectToFormData } from "@/helpers/objectToFormData";
import { CategoryServerActionResponse } from "@/types/server-action";

type BaseCategoryFormProps = {
  title: string;
  description: string;
  submitButtonText: string;
  actionVerb: string;
  children: React.ReactNode;
  action: (formData: FormData) => Promise<CategoryServerActionResponse>;
};

type AddCategoryFormProps = BaseCategoryFormProps & {
  initialData?: never;
  previewImage?: never;
};

type EditCategoryFormProps = BaseCategoryFormProps & {
  initialData: Partial<CategoryFormData>;
  previewImage: string;
};

type CategoryFormProps = AddCategoryFormProps | EditCategoryFormProps;

export default function CategoryFormSheet({
  title,
  description,
  submitButtonText,
  actionVerb,
  initialData,
  previewImage,
  children,
  action,
}: CategoryFormProps) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(true);
  const imageDropzoneRef = useRef<HTMLDivElement>(null);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      image: undefined,
      slug: "",
      subcategories: [],
    },
  });

  useEffect(() => {
    // Determine if this is add mode or edit mode
    const hasInitialData = initialData && Object.keys(initialData).length > 0;
    setIsAddMode(!hasInitialData);

    if (hasInitialData) {
      form.reset({
        name: initialData.name || "",
        description: initialData.description || "",
        image: initialData.image || undefined, // Keep the existing image URL
        slug: initialData.slug || "",
        subcategories: initialData.subcategories || [],
      });
    } else {
      // For add mode, ensure form is completely empty
      form.reset({
        name: "",
        description: "",
        image: undefined,
        slug: "",
        subcategories: [],
      });
    }
  }, [form, initialData]);

  const onSubmit = (data: CategoryFormData) => {
    console.log('=== FORM SUBMIT DEBUG ===');
    console.log('Form data received:', data);
    console.log('Subcategories in form data:', data.subcategories);
    console.log('Subcategories length:', data.subcategories?.length || 0);

    // Debug: Check if subcategories array has valid data
    if (data.subcategories && data.subcategories.length > 0) {
      data.subcategories.forEach((sub, index) => {
        console.log(`Subcategory ${index}:`, sub);
      });
    }

    const formData = objectToFormData(data);
    console.log('FormData created successfully');
    console.log('=== END FORM SUBMIT DEBUG ===');

    startTransition(async () => {
      const result = await action(formData);

      if ("validationErrors" in result) {
        Object.keys(result.validationErrors).forEach((key) => {
          form.setError(key as keyof CategoryFormData, {
            message: result.validationErrors![key],
          });
        });

        form.setFocus(
          Object.keys(result.validationErrors)[0] as keyof CategoryFormData
        );
      } else if ("dbError" in result) {
        toast.error(result.dbError);
      } else {
        // Reset form to completely empty state after successful submission
        form.reset({
          name: "",
          description: "",
          image: undefined,
          slug: "",
          subcategories: [],
        });

        toast.success(
          `Category ${actionVerb} successfully!`,
          { position: "top-center" }
        );
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        setIsSheetOpen(false);
      }
    });
  };

  const onInvalid = (errors: FieldErrors<CategoryFormData>) => {
    if (errors.image) {
      imageDropzoneRef.current?.focus();
    }
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
      {children}

      <SheetContent className="w-[90%] max-w-5xl">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, onInvalid)}
            className="size-full"
          >
            <FormSheetContent>
              <FormSheetHeader>
                <div className="flex flex-col">
                  <SheetTitle>{title}</SheetTitle>
                  <SheetDescription>{description}</SheetDescription>
                </div>
              </FormSheetHeader>

              <FormSheetBody>
                <div className="space-y-6">
                  <FormTextInput
                    control={form.control}
                    name="name"
                    label="Category Name"
                    placeholder="Category Name / Title"
                  />

                  <FormTextarea
                    control={form.control}
                    name="description"
                    label="Category Description"
                    placeholder="Category Description"
                  />

                  <FormImageInput
                    control={form.control}
                    name="image"
                    label="Category Image"
                    previewImage={previewImage}
                    ref={imageDropzoneRef}
                  />

                  <FormSlugInput
                    form={form}
                    control={form.control}
                    name="slug"
                    label="Category Slug"
                    placeholder="Category Slug"
                    generateSlugFrom="name"
                  />

                  <SubcategoryList control={form.control} form={form} />
                </div>
              </FormSheetBody>

              <FormSheetFooter>
                <FormSubmitButton isPending={isPending} className="w-full">
                  {submitButtonText}
                </FormSubmitButton>
              </FormSheetFooter>
            </FormSheetContent>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
