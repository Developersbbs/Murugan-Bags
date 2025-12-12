import * as z from "zod";

const MAX_FILE_SIZE_MB = 3;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024; // 3MB
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const fileSchema = z
  .instanceof(File, { message: "Product image is required" })
  .refine(
    (file) => file.size <= MAX_FILE_SIZE,
    `File size must be less than ${MAX_FILE_SIZE_MB}MB`
  )
  .refine(
    (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
    "Only .jpg, .jpeg, .png and .webp formats are supported"
  );

// Variant combination schema matching the backend structure
const variantCombinationSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(), // Variant display name (e.g., "Product Name - Size S")
  sku: z.string().optional(),
  slug: z.string().optional(), // Optional variant identifier, no URL format required
  costPrice: z.number().min(0).optional(),
  cost_price: z.number().min(0).optional(),
  salesPrice: z.number().min(0).optional(),
  selling_price: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  minStock: z.number().int().min(0).optional(),
  status: z.enum(['selling', 'out_of_stock', 'draft', 'archived']).optional(),
  images: z.array(z.union([z.string(), z.instanceof(File)])).default([]),
  attributes: z.record(z.string()).default({}),
  published: z.boolean().default(true),
});

// Variant data schema matching what the form sends
const variantDataSchema = z.object({
  attributes: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    values: z.array(z.string()),
  })).default([]),
  combinations: z.array(variantCombinationSchema).default([]),
  autoGenerateSKU: z.boolean().default(true),
  selectedValues: z.record(z.array(z.string())).optional(), // Add selectedValues for form initialization
});

export const productFormSchema = z
  .object({
    productType: z.enum(["physical", "digital"], {
      required_error: "Product type is required",
    }),
    productStructure: z.enum(["simple", "variant"]).optional().nullable().default("simple"),
    name: z
      .string()
      .min(1, { message: "Product name is required" })
      .max(100, "Product name must be 100 characters or less"),
    description: z
      .string()
      .min(1, { message: "Product description is required" })
      .max(1000, "Product description must be 1000 characters or less"),
    images: z.array(fileSchema).optional().default([]),
    sku: z
      .string()
      .min(1, { message: "SKU is required" })
      .max(30, "SKU must be 30 characters or less")
      .transform((val) => val ? val.toUpperCase() : val),
    categories: z
      .array(z.object({
        categoryId: z.string(),
        categoryName: z.string().optional(),
        categorySlug: z.string().optional(),
        subcategoryIds: z.array(z.string()).optional().default([]),
        subcategoryNames: z.array(z.string()).optional(),
      }))
      .optional()
      .default([]),
    costPrice: z.coerce
      .number({
        invalid_type_error: "Cost price must be a number",
      })
      .min(0, { message: "Cost price cannot be negative" })
      .finite()
      .optional()
      .transform((val) => val === 0 ? undefined : val)
      .or(z.literal(undefined)),
    salesPrice: z.coerce
      .number({
        invalid_type_error: "Sales price must be a number",
      })
      .min(0, { message: "Sales price cannot be negative" })
      .finite()
      .optional()
      .transform((val) => val === 0 ? undefined : val)
      .or(z.literal(undefined)),
    stock: z.coerce
      .number({
        invalid_type_error: "Stock must be a number",
      })
      .int({ message: "Stock must be a whole number" })
      .min(0, { message: "Stock cannot be negative" })
      .optional()
      .transform((val) => {
        // Convert empty values to undefined
        return val || undefined;
      })
      .or(z.literal(undefined)),
    minStockThreshold: z.coerce
      .number({
        invalid_type_error: "Min stock threshold must be a number",
      })
      .int({ message: "Min stock threshold must be a whole number" })
      .min(0, { message: "Min stock threshold cannot be negative" })
      .optional()
      .transform((val) => {
        // If value is 0, NaN, or empty string, treat as undefined (not set)
        if (val === 0 || val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
          return undefined;
        }
        return val;
      })
      .or(z.literal(undefined)),
    status: z.enum(['selling', 'out_of_stock', 'draft', 'archived']).optional(),
    weight: z.coerce
      .number({
        invalid_type_error: "Weight must be a number",
      })
      .min(0, { message: "Weight cannot be negative" })
      .optional()
      .or(z.literal("")),
    // Physical product variant fields
    color: z.string().optional(),
    size: z.string().optional(),
    material: z.string().optional(),
    brand: z.string().optional(),
    warranty: z.string().optional(),
    isCodAvailable: z.boolean().default(true),
    isFreeShipping: z.boolean().default(false),
    showRatings: z.boolean().default(true),
    // Digital product fields
    fileUpload: z.instanceof(File).optional(),
    fileSize: z.coerce.number().min(0).optional(),
    downloadFormat: z.string().optional(),
    licenseType: z.string().optional(),
    downloadLimit: z.coerce.number().int().min(0).optional(),
    tags: z.array(z.string()).optional().default([]),
    // SEO data as individual fields (matching form field names)
    seoTitle: z.string().max(60, "SEO title must be 60 characters or less").optional().default(""),
    seoDescription: z.string().max(160, "SEO description must be 160 characters or less").optional().default(""),
    seoKeywords: z.array(z.string()).optional().default([]),
    seoCanonical: z.string().optional().default(""),
    seoRobots: z.enum(['index,follow', 'noindex,nofollow', 'index,nofollow', 'noindex,follow']).optional().default("index,follow"),
    seoOgTitle: z.string().max(95, "Open Graph title must be 95 characters or less").optional().default(""),
    seoOgDescription: z.string().max(200, "Open Graph description must be 200 characters or less").optional().default(""),
    seoOgImage: z.string().optional().default(""),
    slug: z
      .string()
      .min(1, { message: "Product slug is required" })
      .max(100, "Product slug must be 100 characters or less")
      .regex(/^[a-z0-9-]+$/, {
        message:
          "Slug must be lowercase, alphanumeric, and use hyphens for spaces",
      })
      .optional(),
    // Variant management data
    product_variants: variantDataSchema.optional().nullable(),
  })
  .superRefine((data, ctx) => {
    console.log('=== SCHEMA VALIDATION STARTED ===');
    console.log('Product type:', data.productType);
    console.log('Product structure in schema:', data.productStructure);
    console.log('costPrice:', data.costPrice);

    // Validate that variant products have at least one variant combination
    if (data.productStructure === 'variant') {
      if (!data.product_variants?.combinations || data.product_variants.combinations.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one variant combination is required for variant products',
          path: ['product_variants'],
        });
      }
    }
    console.log('salesPrice:', data.salesPrice);
    console.log('Full data:', data);

    // For digital products, ensure productStructure is set to 'simple'
    if (data.productType === 'digital') {
      if (!data.productStructure || data.productStructure === null) {
        data.productStructure = 'simple';
        console.log('Set productStructure to "simple" for digital product in schema validation');
      }
    }

    if (data.salesPrice && data.costPrice && data.salesPrice <= data.costPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sales price must be greater than cost price",
        path: ["salesPrice"],
      });
    }

    // Validate based on product structure (skip for digital products as they're always simple)
    if (data.productType !== 'digital' && data.productStructure === "simple") {
      console.log('Running SIMPLE product validation');
      // For simple products, prices are required
      if (!data.costPrice) {
        console.log('Adding costPrice validation error for simple product');
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cost price is required for simple products",
          path: ["costPrice"],
        });
      }
      if (!data.salesPrice) {
        console.log('Adding salesPrice validation error for simple product');
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sales price is required for simple products",
          path: ["salesPrice"],
        });
      }
      // For simple products, stock is optional but if provided, should be valid
      if (data.stock !== undefined && data.stock < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Stock cannot be negative",
          path: ["stock"],
        });
      }
    } else if (data.productStructure === "variant") {
      console.log('Running VARIANT product validation');
      // For variant products, we don't enforce main product prices/stock to be empty
      // The form handles clearing them, and the backend will ignore them if present
    }

    // Validate digital product requirements
    if (data.productType === "digital") {
      // Digital products can be created without a file initially - files can be uploaded later
      // But if any digital fields are provided, they should be valid
      if (data.fileUpload) {
        // For digital products, fileSize and downloadFormat are auto-calculated when file is uploaded
        // Allow some flexibility in validation since these are set asynchronously
        if (data.fileSize !== undefined && data.fileSize <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "File size must be greater than 0 when uploading a file",
            path: ["fileSize"],
          });
        }
        if (data.downloadFormat !== undefined && !data.downloadFormat.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Download format must be specified when uploading a file",
            path: ["downloadFormat"],
          });
        }
      }
      if (data.fileSize && data.fileSize > 0 && !data.fileUpload) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "File upload is required when specifying file size",
          path: ["fileUpload"],
        });
      }
      if (data.downloadFormat && !data.fileUpload) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "File upload is required when specifying download format",
          path: ["fileUpload"],
        });
      }
      if (data.licenseType && !data.fileUpload) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "File upload is required when specifying license type",
          path: ["fileUpload"],
        });
      }
      // For digital products, stock should be 0
      if (data.stock && data.stock !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Digital products should not have stock",
          path: ["stock"],
        });
      }
      if (data.minStockThreshold && data.minStockThreshold !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Digital products should not have minimum stock threshold",
          path: ["minStockThreshold"],
        });
      }
    }

    // Validate variants if present
    if (data.product_variants && data.product_variants.combinations.length > 0) {
      const skus = data.product_variants.combinations
        .map(c => c.sku)
        .filter(sku => sku && sku.trim() !== '');

      const uniqueSkus = new Set(skus);

      if (skus.length !== uniqueSkus.size) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Variant SKUs must be unique",
          path: ["product_variants"],
        });
      }
    }
  });

export const productBulkFormSchema = z
  .object({
    published: z.coerce.boolean().optional(),
    category: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (typeof data.published === "undefined" && data.category === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one of the fields must be filled.",
        path: ["published"],
      });
    }
  });

export type ProductFormData = z.infer<typeof productFormSchema>;
export type ProductBulkFormData = z.infer<typeof productBulkFormSchema>;