"use server";

import { revalidatePath } from "next/cache";
import { productFormSchema } from "@/app/(dashboard)/products/_components/form/schema";
import { formatValidationErrors } from "@/helpers/formatValidationErrors";
import { ProductServerActionResponse } from "@/types/server-action";
import { storage } from "@/firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function addProduct(
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
  console.log('Extracted images from FormData:', images.length, 'files');

  // For variant products, check if there are variant images if no main images
  const productStructure = formData.get("product_structure") as string;
  let hasVariantImages = false;

  if (images.length === 0 && productStructure === 'variant') {
    // Check for variant images
    let comboIndex = 0;
    let fileIndex = 0;

    while (true) {
      const file = formData.get(`variantImages[${comboIndex}][${fileIndex}]`);
      if (!file || !(file instanceof File)) {
        if (fileIndex === 0) {
          comboIndex++;
          if (comboIndex > 50) break; // Safety limit
          fileIndex = 0;
          continue;
        }
        comboIndex++;
        fileIndex = 0;
        if (comboIndex > 50) break; // Safety limit
        continue;
      }
      hasVariantImages = true;
      break; // Found at least one, that's enough for validation
    }

    console.log('Found variant images:', hasVariantImages);
  }

  // Validate images: require main images for simple products, allow variant images for variant products
  if (images.length === 0 && !hasVariantImages) {
    return {
      validationErrors: {
        images: productStructure === 'variant'
          ? "At least one product image or variant image is required"
          : "At least one product image is required",
      },
    };
  }

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
    console.error("Failed to parse seoKeywords:", e);
  }

  // Parse variants
  const variantsJson = formData.get("product_variants");
  let variants = null;
  try {
    variants = variantsJson ? JSON.parse(variantsJson as string) : null;
    console.log('🚨 FRONTEND ACTION: Parsed variants from FormData:', variants);
    console.log('🚨 FRONTEND ACTION: Variants combinations count:', variants?.combinations?.length || 0);

    // Debug: Log each combination's pricing data
    if (variants?.combinations?.length > 0) {
      variants.combinations.forEach((combo: any, index: number) => {
        console.log(`🚨 FRONTEND ACTION: Combination ${index}:`, {
          name: combo.name,
          sku: combo.sku,
          cost_price: combo.cost_price,
          selling_price: combo.selling_price,
          stock: combo.stock,
          minStock: combo.minStock,
          attributes: combo.attributes
        });
      });
    }
  } catch (e) {
    console.error("Failed to parse variants:", e);
  }

  // Extract variant image files from FormData (for all combinations)
  const variantImageFiles: { [key: string]: File[] } = {};
  let comboIndex = 0;
  let fileIndex = 0;

  console.log('🚨 FRONTEND ACTION: Starting variant image extraction...');

  while (true) {
    const file = formData.get(`variantImages[${comboIndex}][${fileIndex}]`);

    if (!file || !(file instanceof File)) {
      // Check if there are more combinations
      if (fileIndex === 0) {
        // If we checked index 0 and found nothing, check a few more combo indices just in case
        // But usually if combo 0 is missing, we might be done, or we need to skip
        // The previous logic was:
        comboIndex++;
        if (comboIndex > 50) break; // Safety limit
        fileIndex = 0;

        // Check if the next combo exists in variants data to decide whether to continue
        if (variants && variants.combinations && comboIndex >= variants.combinations.length) {
          break;
        }
        continue;
      }
      comboIndex++;
      fileIndex = 0;
      if (comboIndex > 50) break; // Safety limit
      continue;
    }

    if (!variantImageFiles[comboIndex.toString()]) {
      variantImageFiles[comboIndex.toString()] = [];
    }
    variantImageFiles[comboIndex.toString()].push(file);
    console.log(`🚨 FRONTEND ACTION: Added file to variantImageFiles[${comboIndex}]:`, file.name);
    fileIndex++;
  }

  console.log('🚨 FRONTEND ACTION: Found variant image files:', variantImageFiles);

  // Parse product structure from FormData (snake_case)
  const productStructureValue = formData.get("product_structure");

  const parsedData = productFormSchema.safeParse({
    productType: formData.get("productType"),
    productStructure: productStructureValue, // Parse snake_case from FormData
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
    // Upload primary images to Firebase storage and collect URLs
    const uploadImageToFirebase = async (file: File, folder: string) => {
      const sanitizedName = file.name.replace(/\s+/g, "_");
      const fileExtension = sanitizedName.split('.').pop();
      const fileName = `${folder}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}.${fileExtension}`;
      const storageRef = ref(storage, `${folder}/${fileName}`);
      const snapshot = await uploadBytes(storageRef, file);
      return getDownloadURL(snapshot.ref);
    };

    const productImageUrls = await Promise.all(
      images.map((image) => uploadImageToFirebase(image, "products"))
    );

    // Upload variant images to Firebase and map URLs by combination index
    const variantImageUrls: Record<string, string[]> = {};
    console.log('🚨 FRONTEND ACTION: Starting Firebase upload for variant images:', Object.keys(variantImageFiles));

    await Promise.all(
      Object.entries(variantImageFiles).map(async ([comboIdx, files]) => {
        console.log(`🚨 FRONTEND ACTION: Uploading ${files.length} files for variant ${comboIdx}`);
        const urls = await Promise.all(
          files.map((file) => uploadImageToFirebase(file, "product-variants"))
        );
        variantImageUrls[comboIdx] = urls;
        console.log(`🚨 FRONTEND ACTION: Uploaded ${urls.length} URLs for variant ${comboIdx}:`, urls);
      })
    );

    console.log('🚨 FRONTEND ACTION: Final variantImageUrls:', variantImageUrls);

    // Replace variant combination File references with URL strings
    if (variants && variants.combinations && variants.combinations.length > 0) {
      console.log('🚨 DEBUG: Starting variant image merge process');

      variants.combinations = variants.combinations.map((combination: any, index: number) => {
        const urlList = variantImageUrls[index.toString()] || [];
        const existingUrls = (combination.images || []).filter((img: any) => typeof img === "string");

        return {
          ...combination,
          images: [...existingUrls, ...urlList],
        };
      });

      console.log('🚨 DEBUG: Updated variants.combinations:', variants.combinations);
    }

    // Prepare form data for backend
    const backendFormData = new FormData();
    backendFormData.append("product_type", parsedData.data.productType);
    backendFormData.append("product_structure", parsedData.data.productStructure);
    backendFormData.append("name", parsedData.data.name);
    backendFormData.append("description", parsedData.data.description);
    backendFormData.append("sku", parsedData.data.sku);

    if (parsedData.data.categories && parsedData.data.categories.length > 0) {
      backendFormData.append("categories", JSON.stringify(parsedData.data.categories));
    }

    // Send cost_price and selling_price only for simple products
    if (parsedData.data.productStructure === "simple") {
      backendFormData.append("cost_price", parsedData.data.costPrice.toString());
      backendFormData.append("selling_price", parsedData.data.salesPrice.toString());
    }

    // Send stock and min stock threshold
    if (parsedData.data.stock !== undefined) {
      backendFormData.append("stock", parsedData.data.stock.toString());
    }
    if (parsedData.data.minStockThreshold !== undefined) {
      backendFormData.append("min_stock_threshold", parsedData.data.minStockThreshold.toString());
    }

    // Physical product attributes
    if (parsedData.data.productType === "physical") {
      if (parsedData.data.weight) {
        backendFormData.append("weight", parsedData.data.weight.toString());
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
    }

    // Digital product fields
    if (parsedData.data.productType === "digital") {
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
    }

    // Tags
    if (parsedData.data.tags && parsedData.data.tags.length > 0) {
      backendFormData.append("tags", JSON.stringify(parsedData.data.tags));
    }

    // Published status
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

    // Slug
    if (parsedData.data.slug) {
      backendFormData.append("slug", parsedData.data.slug);
    }

    // Add variants if provided
    if (parsedData.data.product_variants) {
      backendFormData.append("product_variants", JSON.stringify(variants));
    }

    // Add uploaded image URLs to request body
    // For variant products, only use main product images (not variant images)
    let finalImageUrls = productImageUrls;

    // For variant products, don't copy variant images to main image_url field
    // Variant images should only be stored in the variant's images array
    if (parsedData.data.productStructure === 'variant') {
      console.log('Variant product: using only main product images:', finalImageUrls.length);
      // For variant products, main image_url should be empty unless there are actual main product images
      finalImageUrls = [];
    }

    backendFormData.append("image_url", JSON.stringify(finalImageUrls));

    // Add digital file if provided
    if (parsedData.data.fileUpload instanceof File) {
      console.log('Adding digital file:', parsedData.data.fileUpload.name);
      backendFormData.append("fileUpload", parsedData.data.fileUpload);
    }

    // Send to backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`, {
      method: "POST",
      body: backendFormData,
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

      console.error("Product creation failed:", result);
      return { dbError: result.error || "Something went wrong. Please try again later." };
    }

    revalidatePath("/products");

    return { success: true, product: result.data };
  } catch (error: any) {
    console.error("Unexpected error in addProduct:", error);
    return { dbError: error.message || "An unexpected error occurred." };
  }
}