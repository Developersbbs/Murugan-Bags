"use client";

import { useRef, LegacyRef, useState, useTransition, useEffect } from "react";
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
  FormMultipleCategorySubcategoryInput,
  FormMultipleImageInput,
  FormPriceInput,
  FormSlugInput,
  FormTextarea,
  FormTagsInput,
  FormSwitch,
  FormProductTypeSelect,
  FormVariantManagement,
  FormProductStructureSelect,
} from "@/components/shared/form";
import { FormSubmitButton } from "@/components/shared/form/FormSubmitButton";
import { productFormSchema, ProductFormData } from "./schema";
import { objectToFormData } from "@/helpers/objectToFormData";
import { ProductServerActionResponse } from "@/types/server-action";
import { VariantManager } from "@/types/variants";
import { getStockStatus } from "@/utils/stockStatus";

type ProductFormProps = {
  title: string;
  description: string;
  submitButtonText: string;
  actionVerb: string;
  children: React.ReactNode;
  action: (formData: FormData) => Promise<ProductServerActionResponse>;
  initialData?: Partial<ProductFormData>;
  previewImage?: string;
  previewImages?: string[];
};

export default function ProductFormSheet({
  title,
  description,
  submitButtonText,
  actionVerb,
  initialData,
  previewImage,
  previewImages,
  children,
  action,
}: ProductFormProps) {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [container, setContainer] = useState(null);
  const imageDropzoneRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLButtonElement>(null);

  // Handle both previewImage (legacy) and previewImages (new) props
  const [existingImages, setExistingImages] = useState<string[]>(previewImages || (previewImage ? [previewImage] : []));
  const displayPreviewImages = existingImages;

  // Callback to remove an existing image
  const handleRemovePreviewImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  // Sync existingImages with props when they change (e.g. after data fetch)
  useEffect(() => {
    if (previewImages && previewImages.length > 0) {
      console.log('🔄 Syncing existingImages with previewImages prop:', previewImages.length);
      setExistingImages(previewImages);
    } else if (previewImage) {
      console.log('🔄 Syncing existingImages with previewImage prop:', previewImage);
      setExistingImages([previewImage]);
    }
  }, [previewImages, previewImage]);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      productType: "physical",
      productStructure: "simple",
      name: "",
      description: "",
      images: [],
      sku: "",
      categories: [],
      costPrice: undefined,
      salesPrice: undefined,
      stock: undefined,
      minStockThreshold: undefined,
      status: "selling",
      weight: undefined,
      color: "",
      size: "",
      material: "",
      brand: "",
      warranty: "",
      isCodAvailable: true,
      isFreeShipping: false,
      showRatings: true,
      fileUpload: undefined,
      fileSize: undefined,
      downloadFormat: "",
      licenseType: "",
      downloadLimit: undefined,
      tags: [],
      seoTitle: "",
      seoDescription: "",
      seoKeywords: [],
      seoCanonical: "",
      seoRobots: "index,follow",
      seoOgTitle: "",
      seoOgDescription: "",
      seoOgImage: "",
      slug: "",
      // Set default variant structure with default attributes for new products
      product_variants: {
        attributes: [
          {
            id: "attr-size",
            name: "size",
            values: [],
          },
          {
            id: "attr-color",
            name: "color",
            values: [],
          },
          {
            id: "attr-material",
            name: "material",
            values: [],
          },
        ],
        combinations: [],
        autoGenerateSKU: true, // Enable auto-generation of SKUs
      },
      ...initialData,
    },
  });

  // Reset form with initialData after mount to ensure variant data is properly loaded
  useEffect(() => {
    if (initialData) {
      console.log('🔄 FORM RESET: Resetting form with initialData');
      console.log('Initial product_variants:', initialData.product_variants);

      form.reset({
        productType: "physical",
        productStructure: "simple",
        name: "",
        description: "",
        images: [],
        sku: "",
        categories: [],
        costPrice: undefined,
        salesPrice: undefined,
        stock: undefined,
        minStockThreshold: undefined,
        status: "selling",
        weight: undefined,
        color: "",
        size: "",
        material: "",
        brand: "",
        warranty: "",
        isCodAvailable: true,
        isFreeShipping: false,
        showRatings: true,
        fileUpload: undefined,
        fileSize: undefined,
        downloadFormat: "",
        licenseType: "",
        downloadLimit: undefined,
        tags: [],
        seoTitle: "",
        seoDescription: "",
        seoKeywords: [],
        seoCanonical: "",
        seoRobots: "index,follow",
        seoOgTitle: "",
        seoOgDescription: "",
        seoOgImage: "",
        slug: "",
        product_variants: {
          attributes: [
            {
              id: "attr-size",
              name: "size",
              values: [],
            },
            {
              id: "attr-color",
              name: "color",
              values: [],
            },
            {
              id: "attr-material",
              name: "material",
              values: [],
            },
          ],
          combinations: [],
          autoGenerateSKU: true,
        },
        ...initialData,
      });
    }
  }, [initialData, form]);

  // Handle file upload and auto-calculate size and format
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);

      // Calculate file size in MB with better precision handling
      const fileSizeMB = file.size / (1024 * 1024);
      const roundedSize = Math.round(fileSizeMB * 10000) / 10000; // Round to 4 decimal places

      // Get file extension as download format
      const fileExtension = file.name.split('.').pop()?.toUpperCase() || '';
      console.log('File name:', file.name);
      console.log('File extension:', fileExtension);

      // Update form fields with explicit type conversion
      const numericFileSize = Number(roundedSize.toFixed(4));

      console.log('Setting fileSize to:', numericFileSize, 'Type:', typeof numericFileSize);
      console.log('roundedSize.toFixed(4):', roundedSize.toFixed(4));
      console.log('Number conversion:', Number(roundedSize.toFixed(4)));

      // Try different approaches for setting the value
      console.log('Before setValue - current fileSize:', form.getValues('fileSize'));

      form.setValue('fileSize', numericFileSize, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });

      console.log('After setValue - current fileSize:', form.getValues('fileSize'));

      // Set download format - ensure it's never empty
      const formatToSet = fileExtension || 'PDF';
      console.log('Setting downloadFormat to:', formatToSet);
      console.log('Current downloadFormat before setValue:', form.getValues('downloadFormat'));

      form.setValue('downloadFormat', formatToSet, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true
      });

      console.log('After setValue - current downloadFormat:', form.getValues('downloadFormat'));

      // Trigger validation immediately after setting values
      form.trigger(['fileSize', 'downloadFormat']);

      console.log('Form values updated');
      console.log('Current fileSize value:', form.getValues('fileSize'));
      console.log('Current downloadFormat value:', form.getValues('downloadFormat'));
    } else {
      console.log('No file selected');
    }
  };

  // Auto-determine status based on product structure
  const productStructure = form.watch("productStructure");

  useEffect(() => {
    console.log('=== PRODUCT STRUCTURE CHANGED ===');
    console.log('New productStructure value:', productStructure);
    console.log('Current form values BEFORE update:');
    console.log('  productStructure:', form.getValues('productStructure'));
    console.log('  costPrice:', form.getValues('costPrice'));
    console.log('  salesPrice:', form.getValues('salesPrice'));

    if (productStructure === "simple") {
      form.setValue('status', 'selling', {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false
      });
    } else if (productStructure === "variant") {
      form.setValue('status', 'draft', {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false
      });

      // Force immediate clearing of pricing and stock fields to prevent validation race condition
      form.setValue('costPrice', undefined, {
        shouldValidate: false, // Don't trigger validation yet
        shouldDirty: false,
        shouldTouch: false
      });
      form.setValue('salesPrice', undefined, {
        shouldValidate: false, // Don't trigger validation yet
        shouldDirty: false,
        shouldTouch: false
      });
      form.setValue('stock', undefined, {
        shouldValidate: false, // Don't trigger validation yet
        shouldDirty: false,
        shouldTouch: false
      });
      form.setValue('minStockThreshold', undefined, {
        shouldValidate: false, // Don't trigger validation yet
        shouldDirty: false,
        shouldTouch: false
      });

      // Force a manual validation trigger after state updates
      setTimeout(() => {
        form.trigger(['costPrice', 'salesPrice', 'stock', 'minStockThreshold']);
      }, 0);
    }

    console.log('Current form values AFTER update:');
    console.log('  productStructure:', form.getValues('productStructure'));
    console.log('  costPrice:', form.getValues('costPrice'));
    console.log('  salesPrice:', form.getValues('salesPrice'));
  }, [productStructure, form]);

  // Auto-set productStructure when productType changes
  const productType = form.watch("productType");

  useEffect(() => {
    console.log('=== PRODUCT TYPE CHANGED ===');
    console.log('New productType value:', productType);

    if (productType === "digital") {
      // Digital products are always simple structure
      form.setValue('productStructure', 'simple', {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false
      });
      console.log('Set productStructure to "simple" for digital product');
    }

    console.log('Current productStructure after type change:', form.getValues('productStructure'));
  }, [productType, form]);

  // Auto-generate canonical URL when slug changes
  const slug = form.watch("slug");

  useEffect(() => {
    if (slug) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const canonicalUrl = `${baseUrl}/products/${slug}`;
      form.setValue('seoCanonical', canonicalUrl, {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false
      });
    }
  }, [slug, form]);

  // Auto-generate Open Graph image from first product image or variant image
  const images = form.watch("images");
  const variants = form.watch("product_variants");
  const currentOgImage = form.watch("seoOgImage");

  useEffect(() => {
    const productStructure = form.watch("productStructure");

    // For variant products, prioritize variant images for OG image
    if (productStructure === "variant" && variants?.combinations && variants.combinations.length > 0) {
      for (const variant of variants.combinations) {
        if (variant.images && variant.images.length > 0) {
          const firstVariantImage = variant.images[0];

          // For string URLs (when editing existing products), we can show them
          if (typeof firstVariantImage === 'string') {
            if (firstVariantImage.startsWith('http')) {
              console.log('Setting OG image from variant:', firstVariantImage);
              form.setValue('seoOgImage', firstVariantImage, {
                shouldValidate: false,
                shouldDirty: false,
                shouldTouch: false
              });
            } else {
              // Convert relative path to full URL for OG image
              const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
              const fullUrl = `${baseUrl}${firstVariantImage}`;
              console.log('Setting OG image from variant (relative path):', fullUrl);
              form.setValue('seoOgImage', fullUrl, {
                shouldValidate: false,
                shouldDirty: false,
                shouldTouch: false
              });
            }
            return; // Found a variant image, stop looking
          }
        }
      }
    }

    // Fall back to main product images for simple products or if no variant images found
    if (images && images.length > 0) {
      const firstImage = images[0];
      console.log('First image for OG:', firstImage);

      // For string URLs (when editing existing products), convert to full URL
      if (typeof firstImage === 'string') {
        if (firstImage.startsWith('http')) {
          form.setValue('seoOgImage', firstImage, {
            shouldValidate: false,
            shouldDirty: false,
            shouldTouch: false
          });
        } else {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
          const fullUrl = `${baseUrl}${firstImage}`;
          console.log('Setting OG image from main image (relative path):', fullUrl);
          form.setValue('seoOgImage', fullUrl, {
            shouldValidate: false,
            shouldDirty: false,
            shouldTouch: false
          });
        }
      }
    }
  }, [images, variants, form]);

  // Helper function to get OG image preview text
  const getOgImagePreview = () => {
    if (currentOgImage) {
      // If currentOgImage already has a full URL, return it
      if (typeof currentOgImage === 'string' && currentOgImage.startsWith('http')) {
        return currentOgImage;
      }
      // Otherwise, prepend the base URL
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:5000';
      return `${baseUrl}${currentOgImage}`;
    }

    const productStructure = form.watch("productStructure");

    // Check variant images first (for variant-specific OG image)
    if (productStructure === "variant" && variants?.combinations && variants.combinations.length > 0) {
      for (const variant of variants.combinations) {
        if (variant.images && variant.images.length > 0) {
          const firstVariantImage = variant.images[0];
          if (typeof firstVariantImage === 'string') {
            if (firstVariantImage.startsWith('http')) {
              return firstVariantImage;
            }
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:5000';
            return `${baseUrl}${firstVariantImage}`;
          }
          return `Variant has ${variant.images.length} image(s) - first will be used for social sharing`;
        }
      }
    }

    // Fall back to main product images
    if (images && images.length > 0) {
      const firstImage = images[0];
      if (typeof firstImage === 'string') {
        if (firstImage.startsWith('http')) {
          return firstImage;
        }
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:5000';
        return `${baseUrl}${firstImage}`;
      }
      return `${images.length} image(s) uploaded - first will be used for social sharing`;
    }

    return "No images uploaded yet";
  };

  // Debug: Watch form values for fileSize and downloadFormat
  const fileSize = form.watch("fileSize");
  const downloadFormat = form.watch("downloadFormat");

  useEffect(() => {
    console.log('Form field values:', { fileSize, downloadFormat });
  }, [fileSize, downloadFormat]);

  const onSubmit = (data: ProductFormData) => {
    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('Form submission data:', data);
    console.log('Product structure value:', data.productStructure);

    // Get the absolute latest form values to ensure we have current state
    const currentFormData = form.getValues();
    console.log('Current form values from form.getValues():', currentFormData);
    console.log('Product structure from form.getValues:', currentFormData.productStructure);
    console.log('costPrice from form.getValues:', currentFormData.costPrice);
    console.log('salesPrice from form.getValues:', currentFormData.salesPrice);

    // Use the current form values instead of the potentially stale 'data' parameter
    const finalData = { ...data, ...currentFormData };

    // Add existing images to the final data so they are sent to the backend
    // The backend expects 'existing_images' as a JSON string of URLs
    if (existingImages && existingImages.length > 0) {
      console.log('Adding existing images to submission:', existingImages);
      // @ts-ignore - adding property that might not be in the type definition yet
      finalData.existing_images = JSON.stringify(existingImages);
    } else {
      // Explicitly send empty string if no existing images, to signal removal of all previous images
      // (unless new images are being uploaded, which are handled by the 'images' field)
      console.log('No existing images to preserve');
      // @ts-ignore
      finalData.existing_images = "";
    }

    // Ensure auto-generated values are set before submission
    const currentSlug = form.getValues('slug');
    // For variant products, stock values come from variants, not the main product
    const currentStock = finalData.productStructure === 'variant' ? undefined : form.getValues('stock');
    const currentMinStock = finalData.productStructure === 'variant' ? undefined : form.getValues('minStockThreshold');
    const currentVariants = form.getValues('product_variants');

    console.log('Current variants from form.getValues():', currentVariants);
    console.log('Variants combinations count:', currentVariants?.combinations?.length || 0);

    // Trigger canonical URL generation if slug exists
    if (currentSlug) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourstore.com';
      const canonicalUrl = `${baseUrl}/products/${currentSlug}`;
      form.setValue('seoCanonical', canonicalUrl, {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false
      });
    }

    // Trigger robots meta generation based on stock and variants
    const isBaseInStock = (currentStock || 0) > (currentMinStock || 0);
    const hasVariantsInStock = currentVariants?.combinations && currentVariants.combinations.length > 0
      ? currentVariants.combinations.some((variant: any) =>
        variant.stock !== undefined &&
        variant.minStock !== undefined &&
        variant.stock > variant.minStock
      )
      : false;

    const isInStock = isBaseInStock || hasVariantsInStock;
    const isPublished = true;

    let robotsValue: 'index,follow' | 'noindex,nofollow' | 'index,nofollow' | 'noindex,follow' = 'noindex,nofollow';

    if (isPublished && isInStock) {
      robotsValue = 'index,follow';
    } else if (isPublished && !isInStock) {
      robotsValue = 'noindex,follow';
    }

    form.setValue('seoRobots', robotsValue, {
      shouldValidate: false,
      shouldDirty: false,
      shouldTouch: false
    });

    const formData = objectToFormData(finalData);

    console.log('=== CALLING BACKEND ACTION ===');

    // Add a small delay to ensure all form field updates are processed
    setTimeout(() => {
      startTransition(async () => {
        try {
          const result = await action(formData);
          console.log('=== BACKEND RESPONSE ===', result);

          if (!result) {
            toast.error("No response received from server");
            return;
          }

          if ("validationErrors" in result) {
            console.log('Validation errors:', result.validationErrors);
            Object.keys(result.validationErrors).forEach((key) => {
              form.setError(key as keyof ProductFormData, {
                message: result.validationErrors![key],
              });
            });

            form.setFocus(
              Object.keys(result.validationErrors)[0] as keyof ProductFormData
            );
          } else if ("product" in result) {
            console.log('Product created successfully:', result.product);
            // Reset form but keep the default variant structure
            form.reset({
              productType: "physical",
              productStructure: "simple",
              name: "",
              description: "",
              images: [],
              sku: "",
              categories: [],
              costPrice: undefined,
              salesPrice: undefined,
              stock: undefined,
              minStockThreshold: undefined,
              status: "selling",
              weight: undefined,
              color: "",
              size: "",
              material: "",
              brand: "",
              warranty: "",
              isCodAvailable: true,
              isFreeShipping: false,
              showRatings: true,
              fileUpload: undefined,
              fileSize: undefined,
              downloadFormat: "",
              seoTitle: "",
              seoDescription: "",
              seoKeywords: [],
              seoCanonical: "",
              seoRobots: "index,follow",
              seoOgTitle: "",
              seoOgDescription: "",
              seoOgImage: "",
              slug: "",
              // Keep default variant structure for new products
              product_variants: {
                attributes: [
                  {
                    id: "attr-size",
                    name: "size",
                    values: [],
                  },
                  {
                    id: "attr-color",
                    name: "color",
                    values: [],
                  },
                  {
                    id: "attr-material",
                    name: "material",
                    values: [],
                  },
                ],
                combinations: [],
                autoGenerateSKU: true,
              },
            });
            toast.success(
              `Product "${result.product.name}" ${actionVerb} successfully!`,
              { position: "top-center" }
            );
            queryClient.invalidateQueries({ queryKey: ["products"] });
            setIsSheetOpen(false);
          } else {
            console.log('Unexpected response:', result);
            toast.error("Unexpected response from server");
          }
        } catch (error) {
          console.error('=== ACTION ERROR ===', error);
          toast.error("An error occurred while saving the product");
        }
      });
    }, 100);
  };

  const onInvalid = (errors: FieldErrors<ProductFormData>) => {
    console.log('=== FORM VALIDATION FAILED ===');
    console.log('Validation errors:', errors);
    console.log('Error fields:', Object.keys(errors));

    if (errors.images) {
      console.log('Images error:', errors.images);
      imageDropzoneRef.current?.focus();
    } else if (errors.categories) {
      console.log('Categories error:', errors.categories);
      categoryRef.current?.focus();
    }

    // Show toast for first error
    const firstErrorKey = Object.keys(errors)[0];
    const firstError = errors[firstErrorKey as keyof ProductFormData];
    if (firstError && 'message' in firstError) {
      toast.error(`Validation error: ${firstError.message}`);
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
                <div
                  className="space-y-6"
                  ref={setContainer as LegacyRef<HTMLDivElement>}
                >
                  <FormTextInput
                    control={form.control}
                    name="name"
                    label="Product Name"
                    placeholder="Product Name / Title"
                  />

                  <FormProductTypeSelect
                    control={form.control}
                    name="productType"
                    label="Product Type"
                    placeholder="Select product type"
                  />

                  {/* Show product structure only for physical products */}
                  {form.watch("productType") === "physical" && (
                    <FormProductStructureSelect
                      control={form.control}
                      name="productStructure"
                      label="Product Structure"
                      placeholder="Select product structure"
                    />
                  )}

                  <FormSlugInput
                    form={form}
                    control={form.control}
                    name="slug"
                    label="Product Slug"
                    placeholder="Product Slug"
                    generateSlugFrom="name"
                  />

                  <FormTextarea
                    control={form.control}
                    name="description"
                    label="Product Description"
                    placeholder="Product Description"
                  />

                  {/* Show images only for simple products */}
                  {form.watch("productStructure") === "simple" && (
                    <FormMultipleImageInput
                      control={form.control}
                      name="images"
                      label="Product Images"
                      previewImages={displayPreviewImages}
                      onRemovePreviewImage={handleRemovePreviewImage}
                    />
                  )}

                  <FormTextInput
                    control={form.control}
                    name="sku"
                    label="Product SKU"
                    placeholder="Enter base SKU (e.g., TSHIRT)"
                    transform="uppercase"
                  />

                  <FormMultipleCategorySubcategoryInput
                    control={form.control}
                    name="categories"
                    setValue={form.setValue}
                    watch={form.watch}
                  />

                  <FormTagsInput
                    control={form.control}
                    name="tags"
                    label="Product Tags"
                    placeholder="Add product tag"
                    setValue={form.setValue}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormTextInput
                      control={form.control}
                      name="warranty"
                      label="Warranty"
                      placeholder="e.g., 1 Year Warranty"
                    />
                    <div className="space-y-4 pt-2">
                      <FormSwitch
                        control={form.control}
                        name="isCodAvailable"
                        label="COD Available"
                      />
                      <FormSwitch
                        control={form.control}
                        name="isFreeShipping"
                        label="Free Shipping"
                      />
                      <FormSwitch
                        control={form.control}
                        name="showRatings"
                        label="Show Ratings"
                      />
                    </div>
                  </div>

                  {/* Show pricing only for simple products */}
                  {form.watch("productStructure") === "simple" && (
                    <>
                      <FormPriceInput
                        control={form.control}
                        name="costPrice"
                        label="Cost Price"
                        placeholder="Cost Price"
                        min="0"
                      />

                      <FormPriceInput
                        control={form.control}
                        name="salesPrice"
                        label="Sale Price"
                        placeholder="Sale Price"
                        min="0"
                      />
                    </>
                  )}

                  {/* Show stock fields only for simple physical products */}
                  {form.watch("productStructure") === "simple" && form.watch("productType") === "physical" && (
                    <>
                      <FormTextInput
                        control={form.control}
                        name="stock"
                        label="Base Stock"
                        placeholder="Base stock quantity"
                        type="number"
                        min="0"
                      />

                      <FormTextInput
                        control={form.control}
                        name="minStockThreshold"
                        label="Minimum Stock"
                        placeholder="Minimum stock threshold"
                        type="number"
                        min="0"
                      />

                    </>
                  )}
                  {form.watch("productType") === "physical" && form.watch("productStructure") === "variant" && (
                    <FormVariantManagement
                      control={form.control}
                      name="product_variants"
                      label="Product Variants"
                      baseSKU={form.watch("sku") || ""}
                      baseSlug={form.watch("slug") || ""}
                      productName={form.watch("name") || ""}
                    />
                  )}
                  {/* Digital Product Fields */}
                  {form.watch("productType") === "digital" && (
                    <div className="mt-4 space-y-6">
                      <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Digital Product Configuration
                        </h3>

                        {/* File Upload Section */}
                        <div className="mb-6">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">File Information</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormTextInput
                              control={form.control}
                              name="fileUpload"
                              label="Digital File"
                              placeholder="Upload digital file (PDF, MP4, ZIP, CSV, JSON, etc.)"
                              type="file"
                              accept=".pdf,.doc,.docx,.txt,.csv,.json,.xml,.zip,.rar,.7z,.tar,.gz,.mp3,.mp4,.avi,.mov,.wmv,.flv,.webm,.jpg,.jpeg,.png,.gif,.svg,.webp"
                              onChange={handleFileUpload}
                            />

                            <FormTextInput
                              control={form.control}
                              name="fileSize"
                              label="File Size (MB)"
                              placeholder="Auto-calculated"
                              type="number"
                              readOnly
                              className="bg-gray-100"
                            />
                          </div>

                          <div className="mt-4">
                            <FormTextInput
                              control={form.control}
                              name="downloadFormat"
                              label="Download Format"
                              placeholder="Auto-detected"
                              readOnly
                              className="bg-gray-100"
                            />
                          </div>
                        </div>

                        {/* Licensing Section */}
                        <div className="pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Licensing & Access</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormTextInput
                              control={form.control}
                              name="licenseType"
                              label="License Type"
                              placeholder="e.g., Single Use, Commercial, etc."
                            />

                            <FormTextInput
                              control={form.control}
                              name="downloadLimit"
                              label="Download Limit"
                              placeholder="Maximum downloads allowed"
                              type="number"
                              min="1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <FormTextInput
                    control={form.control}
                    name="seoTitle"
                    label="SEO Title"
                    placeholder="SEO page title (optional)"
                  />

                  <FormTextarea
                    control={form.control}
                    name="seoDescription"
                    label="SEO Description"
                    placeholder="SEO meta description (optional)"
                  />

                  <FormTagsInput
                    control={form.control}
                    name="seoKeywords"
                    label="SEO Keywords"
                    placeholder="Add SEO keyword"
                    setValue={form.setValue}
                  />

                  <FormTextInput
                    control={form.control}
                    name="seoCanonical"
                    label="Canonical URL"
                    placeholder="Auto-generated based on product slug"
                    readOnly
                    className="bg-gray-50"
                  />

                  <FormTextInput
                    control={form.control}
                    name="seoRobots"
                    label="Robots Meta"
                    placeholder="Auto-generated based on stock and published status"
                    readOnly
                    className="bg-gray-50"
                  />

                  <FormTextInput
                    control={form.control}
                    name="seoOgTitle"
                    label="Open Graph Title"
                    placeholder="Open Graph title for social media"
                  />

                  <FormTextarea
                    control={form.control}
                    name="seoOgDescription"
                    label="Open Graph Description"
                    placeholder="Open Graph description for social media"
                  />

                  <FormTextInput
                    control={form.control}
                    name="seoOgImage"
                    label="Open Graph Image URL"
                    placeholder={(() => {
                      try {
                        return getOgImagePreview() || "Auto-generated from product/variant images";
                      } catch (error) {
                        console.error('Error getting OG image preview:', error);
                        return "Auto-generated from product/variant images";
                      }
                    })()}
                    readOnly
                    className="bg-gray-50"
                  />

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