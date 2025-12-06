"use client";

import { SheetTrigger } from "@/components/ui/sheet";
import { useMemo } from "react";
import { editProduct } from "@/actions/products/editProduct";
import { ProductDetails } from "@/services/products/types";
import ProductFormSheet from "../../_components/form/ProductFormSheet";

import { useAuthorization } from "@/hooks/use-authorization";

type Props = {
  product: ProductDetails;
  children: React.ReactNode;
};

export function EditProductSheet({ product, children }: Props) {
  const { hasPermission } = useAuthorization();

  if (!hasPermission("products", "canEdit")) return null;

  // Transform variant data to match form schema
  const transformVariantsForForm = (variants: any[]) => {
    if (!variants || variants.length === 0) return null;

    // Define default attributes that should always be present
    const defaultAttributes = [
      { name: 'size', values: [], defaultOptions: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
      { name: 'color', values: [], defaultOptions: ['Red', 'Blue', 'Green', 'Black', 'White', 'Yellow', 'Purple', 'Orange'] },
      { name: 'material', values: [], defaultOptions: ['Cotton', 'Polyester', 'Wool', 'Silk', 'Linen', 'Leather', 'Denim'] },
    ];

    // Extract all unique attributes from all variants
    const allAttributes = new Map<string, Set<string>>();

    variants.forEach(variant => {
      if (variant.attributes) {
        Object.entries(variant.attributes).forEach(([key, value]) => {
          if (!allAttributes.has(key)) {
            allAttributes.set(key, new Set());
          }
          allAttributes.get(key)!.add(String(value));
        });
      }
    });

    // Merge default attributes with existing attributes
    const mergedAttributes = defaultAttributes.map(defaultAttr => {
      const existingValuesSet = allAttributes.get(defaultAttr.name) || new Set<string>();
      const existingValuesArray = Array.from(existingValuesSet);
      const allOptions = Array.from(new Set([...defaultAttr.defaultOptions, ...existingValuesArray]));

      return {
        id: `attr-${defaultAttr.name.toLowerCase()}`,
        name: defaultAttr.name,
        values: existingValuesArray, // Selected values only
        options: allOptions.length > 0 ? allOptions : undefined, // All available options including defaults
        type: 'select' as const,
        required: false,
        allowCustom: true,
      };
    });

    // Add any custom attributes that aren't in defaults
    Array.from(allAttributes.entries()).forEach(([name, values]) => {
      if (!defaultAttributes.some(attr => attr.name === name)) {
        const allOptions = Array.from(values);
        mergedAttributes.push({
          id: `attr-${name.toLowerCase()}`,
          name: name,
          values: Array.from(values),
          options: allOptions.length > 0 ? allOptions : undefined,
          type: 'select' as const,
          required: false,
          allowCustom: true,
        });
      }
    });

    // For existing variants, we'll create combinations but also set up selected values
    // so the form shows the attributes as selected
    const combinations = variants.map((variant, index) => {
      console.log(`🔄 PROCESSING VARIANT ${index}:`, variant);
      console.log(`🔄 VARIANT ATTRIBUTES:`, variant.attributes);
      console.log(`🔄 VARIANT ATTRIBUTES TYPE:`, typeof variant.attributes);
      console.log(`🔄 VARIANT ATTRIBUTES KEYS:`, variant.attributes ? Object.keys(variant.attributes) : 'no attributes');

      return {
        id: variant._id || `variant-${index}`,
        // name field removed - only slug will be used
        sku: variant.sku,
        slug: variant.slug || `variant-${index + 1}`, // Use slug or fallback to variant-{index}
        costPrice: variant.cost_price,
        cost_price: variant.cost_price,
        salesPrice: variant.selling_price,
        selling_price: variant.selling_price,
        stock: variant.stock,
        minStock: variant.minStock,
        images: variant.images || [],
        attributes: variant.attributes || {},
        published: variant.published !== false,
      };
    });

    // Create selectedValues that match the existing combinations
    // This will make the form show the attributes as selected
    const selectedValues: Record<string, string[]> = {};

    variants.forEach((variant, idx) => {
      console.log(`🔄 EDIT SHEET: Processing variant ${idx} for selectedValues:`, {
        attributes: variant.attributes,
        attributesType: typeof variant.attributes,
        attributesKeys: variant.attributes ? Object.keys(variant.attributes) : 'no attributes'
      });

      if (variant.attributes) {
        Object.entries(variant.attributes).forEach(([attrName, attrValue]) => {
          const attrId = `attr-${attrName.toLowerCase()}`;
          console.log(`🔄 EDIT SHEET: Processing attribute ${attrName} -> ${attrValue}, attrId: ${attrId}`);

          if (!selectedValues[attrId]) {
            selectedValues[attrId] = [];
          }
          const stringValue = String(attrValue);
          if (!selectedValues[attrId].includes(stringValue)) {
            selectedValues[attrId].push(stringValue);
            console.log(`🔄 EDIT SHEET: Added value ${stringValue} to ${attrId}`);
          }
        });
      }
    });

    const result = {
      attributes: mergedAttributes,
      combinations: combinations,
      autoGenerateSKU: false,
      selectedValues: selectedValues, // Include selected values for form initialization
    };

    console.log("🔄 EDIT SHEET: TRANSFORMED VARIANT DATA:", result);
    console.log("🔄 EDIT SHEET: SELECTED VALUES FOR FORM:", selectedValues);
    console.log("🔄 EDIT SHEET: Selected values count:", Object.keys(selectedValues).length);
    console.log("🔄 EDIT SHEET: Selected values detail:", JSON.stringify(selectedValues, null, 2));
    return result;
  };

  // Transform the variant data
  const formVariants = useMemo(() => {
    return product.product_variants ? transformVariantsForForm(product.product_variants) : null;
  }, [product.product_variants]);

  console.log("EditProductSheet - Product data:", product);
  // ... (logs can remain or be removed, keeping them for now but maybe reduced)

  const initialData = useMemo(() => ({
    name: product.name,
    description: product.description ?? "",
    images: [],
    sku: product.sku,
    productType: (product.product_type as "physical" | "digital") || "physical",
    productStructure: (product.product_variants && product.product_variants.length > 0 ? "variant" : "simple") as "variant" | "simple",
    categories: product.categories ? product.categories.map(cat => {
      // Add null checks for category and its properties
      const categoryId = cat.category?._id || '';
      const categoryName = cat.category?.name || 'Uncategorized';
      const categorySlug = cat.category?.slug || '';

      // Handle subcategories with null check
      const subcategories = Array.isArray(cat.subcategories) ? cat.subcategories : [];

      return {
        categoryId,
        categoryName,
        categorySlug,
        subcategoryIds: subcategories.map(sub => sub?._id || ''),
        subcategoryNames: subcategories.map(sub => sub?.name || ''),
      };
    }) : [],
    costPrice: product.cost_price,
    salesPrice: product.selling_price,
    stock: product.baseStock ?? undefined,
    minStockThreshold: product.minStock ?? undefined,
    slug: product.slug,
    tags: product.tags || [],
    seoTitle: product.seo?.title || "",
    seoDescription: product.seo?.description || "",
    seoKeywords: product.seo?.keywords || [],
    seoCanonical: product.seo?.canonical || "",
    seoRobots: (product.seo?.robots as "index,follow" | "noindex,nofollow" | "index,nofollow" | "noindex,follow") || "index,follow",
    seoOgTitle: product.seo?.ogTitle || "",
    seoOgDescription: product.seo?.ogDescription || "",
    seoOgImage: product.seo?.ogImage || "",
    warranty: product.warranty || "",
    isCodAvailable: product.isCodAvailable !== undefined ? product.isCodAvailable : true,
    isFreeShipping: product.isFreeShipping !== undefined ? product.isFreeShipping : false,
    showRatings: product.showRatings !== undefined ? product.showRatings : true,
    // Add the transformed variant data
    product_variants: formVariants,
  }), [product, formVariants]);

  return (
    <ProductFormSheet
      title="Update Products"
      description="Update necessary product information here"
      submitButtonText="Update Product"
      actionVerb="updated"
      initialData={initialData}
      action={(formData) => editProduct(product._id, formData)}
      previewImages={product.image_url}
    >
      <SheetTrigger asChild>{children}</SheetTrigger>
    </ProductFormSheet>
  );
}