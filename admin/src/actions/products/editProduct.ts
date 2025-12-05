"use server";

import { revalidatePath } from "next/cache";

import { productFormSchema } from "@/app/(dashboard)/products/_components/form/schema";
import { formatValidationErrors } from "@/helpers/formatValidationErrors";
import { ProductServerActionResponse } from "@/types/server-action";

export async function editProduct(
  productId: string,
  formData: FormData
): Promise<ProductServerActionResponse> {

  // Parse categories from form data
  const categoriesJson = formData.get("categories");
  let categories = [];
  try {
    categories = categoriesJson ? JSON.parse(categoriesJson as string) : [];
  } catch (e) {
    console.error("Failed to parse categories:", e);
  }

  // Get images directly from FormData (they're already File objects)
  // objectToFormData appends multiple files with the same key 'images'
  const images = formData.getAll('images').filter((item): item is File => item instanceof File);

  // Parse tags and SEO keywords
  const tagsJson = formData.get("tags");
  let tags = [];
  try {
    tags = tagsJson ? JSON.parse(tagsJson as string) : [];
  } catch (e) {
    console.error("Failed to parse tags:", e);
  }

  const seoKeywordsJson = formData.get("seoKeywords");
  let seoKeywords = [];
  try {
    seoKeywords = seoKeywordsJson ? JSON.parse(seoKeywordsJson as string) : [];
  } catch (e) {
  }

  // Parse variants
  const variantsJson = formData.get("product_variants");
  let variants = null;
  try {
    variants = variantsJson ? JSON.parse(variantsJson as string) : null;
    console.log('Parsed variants from FormData:', variants);
  } catch (e) {
    console.error("Failed to parse variants:", e);
  }

  // Extract variant image files from FormData (for all combinations)
  const variantImageFiles: { [key: string]: File[] } = {};
  let comboIndex = 0;
  let fileIndex = 0;

  while (true) {
    const file = formData.get(`variantImages[${comboIndex}][${fileIndex}]`);
    if (!file || !(file instanceof File)) {
      // Check if there are more combinations
      if (fileIndex === 0) {
        break; // No more combinations
      }
      comboIndex++;
      fileIndex = 0;
      continue;
    }

    if (!variantImageFiles[comboIndex.toString()]) {
      variantImageFiles[comboIndex.toString()] = [];
    }
    variantImageFiles[comboIndex.toString()].push(file);
    fileIndex++;
  }

  console.log('Found variant image files:', variantImageFiles);

  const parsedData = productFormSchema.safeParse({
    productType: formData.get("productType"),
    productStructure: formData.get("product_structure"), // Use snake_case as sent by objectToFormData
    name: formData.get("name"),
    description: formData.get("description"),
    images: images,
    sku: formData.get("sku"),
    categories: categories,
    costPrice: formData.get("costPrice"),
    salesPrice: formData.get("salesPrice"),
    stock: formData.get("stock") || 0,
    minStockThreshold: formData.get("minStockThreshold") || 0,
    weight: formData.get("weight") || undefined,
    color: formData.get("color") || undefined,
    size: formData.get("size") || undefined,
    material: formData.get("material") || undefined,
    brand: formData.get("brand") || undefined,
    warranty: formData.get("warranty") || undefined,
    fileUpload: formData.get("fileUpload") || undefined,
    fileSize: formData.get("fileSize") || undefined,
    downloadFormat: formData.get("downloadFormat") || undefined,
    licenseType: formData.get("licenseType") || undefined,
    downloadLimit: formData.get("downloadLimit") || undefined,
    tags: tags,
    seoTitle: formData.get("seoTitle") || undefined,
    seoDescription: formData.get("seoDescription") || undefined,
    seoKeywords: seoKeywords,
    slug: formData.get("slug"),
    product_variants: variants,
  });

  if (!parsedData.success) {
    return {
      validationErrors: formatValidationErrors(
        parsedData.error.flatten().fieldErrors
      ),
    };
  }

  try {
    // Prepare form data for backend - send categories in the nested format expected by backend
    const backendFormData = new FormData();
    backendFormData.append("product_type", parsedData.data.productType);
    backendFormData.append("name", parsedData.data.name);
    backendFormData.append("description", parsedData.data.description);
    backendFormData.append("sku", parsedData.data.sku);

    // Send categories in the nested format: [{ categoryId: "...", subcategoryIds: [...] }]
    if (parsedData.data.categories && parsedData.data.categories.length > 0) {
      backendFormData.append("categories", JSON.stringify(parsedData.data.categories));
    }

    backendFormData.append("cost_price", parsedData.data.costPrice?.toString() || "0");
    backendFormData.append("selling_price", parsedData.data.salesPrice?.toString() || "0");
    // Send inventory fields using backend's expected keys
    if (parsedData.data.stock !== undefined) {
      backendFormData.append("stock", parsedData.data.stock.toString());
    }
    if (parsedData.data.minStockThreshold !== undefined) {
      backendFormData.append("min_stock_threshold", parsedData.data.minStockThreshold.toString());
    }

    if (parsedData.data.color) {
      backendFormData.append("color", parsedData.data.color);
    }
    if (parsedData.data.size) {
      backendFormData.append("size", parsedData.data.size);
    }
    if (parsedData.data.material) {
      backendFormData.append("material", parsedData.data.material);
    }
    if (parsedData.data.brand) {
      backendFormData.append("brand", parsedData.data.brand);
    }
    if (parsedData.data.warranty) {
      backendFormData.append("warranty", parsedData.data.warranty);
    }
    if (parsedData.data.fileSize) {
      backendFormData.append("file_size", parsedData.data.fileSize.toString());
    }
    if (parsedData.data.downloadFormat) {
      backendFormData.append("download_format", parsedData.data.downloadFormat);
    }
    if (parsedData.data.licenseType) {
      backendFormData.append("license_type", parsedData.data.licenseType);
    }
    if (parsedData.data.downloadLimit) {
      backendFormData.append("download_limit", parsedData.data.downloadLimit.toString());
    }
    if (parsedData.data.tags !== undefined) {
      backendFormData.append("tags", JSON.stringify(parsedData.data.tags || []));
    }
    backendFormData.append("published", "true");
    // SEO fields as individual fields
    if (parsedData.data.seoTitle) {
      backendFormData.append("seo_title", parsedData.data.seoTitle);
    }
    if (parsedData.data.seoDescription) {
      backendFormData.append("seo_description", parsedData.data.seoDescription);
    }
    if (parsedData.data.seoKeywords && parsedData.data.seoKeywords.length > 0) {
      backendFormData.append("seo_keywords", JSON.stringify(parsedData.data.seoKeywords));
    }
    if (parsedData.data.seoCanonical) {
      backendFormData.append("seo_canonical", parsedData.data.seoCanonical);
    }
    if (parsedData.data.seoRobots) {
      backendFormData.append("seo_robots", parsedData.data.seoRobots);
    }
    if (parsedData.data.seoOgTitle) {
      backendFormData.append("seo_og_title", parsedData.data.seoOgTitle);
    }
    if (parsedData.data.seoOgDescription) {
      backendFormData.append("seo_og_description", parsedData.data.seoOgDescription);
    }
    if (parsedData.data.seoOgImage) {
      backendFormData.append("seo_og_image", parsedData.data.seoOgImage);
    }
    if (parsedData.data.product_variants) {
      backendFormData.append("product_variants", JSON.stringify(parsedData.data.product_variants));
    }

    // Add variant image files if provided
    Object.entries(variantImageFiles).forEach(([comboIndex, files]) => {
      files.forEach((file, fileIndex) => {
        backendFormData.append(`variantImages[${comboIndex}][${fileIndex}]`, file);
      });
    });

    // Add images if provided
    if (parsedData.data.images && parsedData.data.images.length > 0) {
      parsedData.data.images.forEach((imageFile) => {
        if (imageFile instanceof File) {
          backendFormData.append('images', imageFile);
        }
      });
    }

    // Add existing images if provided
    const existingImages = formData.get("existing_images");
    if (existingImages) {
      backendFormData.append("existing_images", existingImages);
    }

    // Add digital file if provided
    if (parsedData.data.fileUpload instanceof File) {
      backendFormData.append("digital_file", parsedData.data.fileUpload);
    }

    // Send to backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products/${productId}`, {
      method: "PUT",
      body: backendFormData, // Send as FormData, not JSON
    });

    const result = await response.json();

    if (!response.ok) {
      // Handle specific validation errors
      if (result.error?.includes("slug")) {
        return {
          validationErrors: {
            slug: "This product slug is already in use. Please choose a different one.",
          },
        };
      } else if (result.error?.includes("sku") || result.error?.includes("SKU")) {
        return {
          validationErrors: {
            sku: "This product SKU is already assigned to an existing item. Please enter a different SKU.",
          },
        };
      }

      console.error("Product update failed:", result);
      return { dbError: result.error || "Something went wrong. Please try again later." };
    }

    revalidatePath("/products");

    return { success: true, product: result.data };
  } catch (error: any) {
    console.error("Unexpected error in editProduct:", error);
    return { dbError: error.message || "An unexpected error occurred." };
  }
}
