const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema({
  name: { type: String }, // Made optional since frontend only uses slug
  sku: { type: String, required: true },
  slug: { type: String, required: true }, // Added slug field as required
  cost_price: { type: Number, required: true },
  selling_price: { type: Number, required: true },
  stock: { type: Number },
  minStock: { type: Number },
  status: {
    type: String,
    enum: ['selling', 'out_of_stock', 'draft', 'archived', 'low_stock'],
    default: 'selling'
  },
  images: [{ type: String }],
  attributes: {
    type: Map,
    of: String,
    default: new Map()
  },
  published: { type: Boolean, default: true }
});

// Add compound index for product + variant SKU uniqueness
variantSchema.index({ sku: 1 });

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    product_type: {
      type: String,
      enum: ["physical", "digital"],
      default: "physical"
    },

    // Category & Subcategory links
    categories: [
      {
        category: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "categories",
          required: true
        },
        subcategories: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "subcategories"
          }
        ]
      }
    ],

    // Product-level details
    image_url: [{ type: String }],
    sku: { type: String, required: true },

    cost_price: {
      type: Number,
      min: 0,
      validate: {
        validator: function (value) {
          // For simple products, cost_price is required
          if (this.product_structure === 'simple') {
            return value !== undefined && value !== null && value >= 0;
          }
          // For variable products, cost_price should not be set (variants handle pricing)
          return value === undefined || value === null;
        },
        message: function () {
          if (this.product_structure === 'simple') {
            return 'Cost price is required for simple products';
          } else {
            return 'Variable products should not have main product cost price (use variant pricing instead)';
          }
        }
      }
    },
    selling_price: {
      type: Number,
      min: 0,
      validate: {
        validator: function (value) {
          // For simple products, selling_price is required
          if (this.product_structure === 'simple') {
            return value !== undefined && value !== null && value >= 0;
          }
          // For variable products, selling_price should not be set (variants handle pricing)
          return value === undefined || value === null;
        },
        message: function () {
          if (this.product_structure === 'simple') {
            return 'Selling price is required for simple products';
          } else {
            return 'Variable products should not have main product selling price (use variant pricing instead)';
          }
        }
      }
    },
    baseStock: { type: Number },
    minStock: { type: Number },

    // Rating and review fields
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0, min: 0 }, // Count of star ratings
    totalReviews: { type: Number, default: 0, min: 0 }, // Count of actual text reviews

    // Status field is only used for simple products
    status: {
      type: String,
      enum: ['selling', 'out_of_stock', 'draft', 'archived', 'low_stock'],
      default: 'draft',
      required: function () { return this.product_structure === 'simple'; },
      select: function () { return this.product_structure === 'simple'; }
    },
    product_structure: {
      type: String,
      enum: ["simple", "variant"],
      default: "simple"
    },

    // Physical product attributes
    weight: { type: Number },
    color: { type: String },

    // Digital product fields
    file_path: { type: String },
    file_size: { type: Number },
    download_format: { type: String },
    license_type: { type: String },
    download_limit: { type: Number },

    // Additional Product Details
    warranty: { type: String },
    isCodAvailable: { type: Boolean, default: true },
    isFreeShipping: { type: Boolean, default: false },
    showRatings: { type: Boolean, default: true },

    // Variants (with publish control)
    product_variants: [variantSchema],

    // SEO & metadata
    tags: [{ type: String }],
    seo: {
      title: { type: String },
      description: { type: String },
      keywords: [{ type: String }],
      canonical: { type: String },
      robots: { type: String, enum: ['index,follow', 'noindex,nofollow', 'index,nofollow', 'noindex,follow'], default: 'index,follow' },
      ogTitle: { type: String },
      ogDescription: { type: String },
      ogImage: { type: String }
    },

    // Product visibility - only used for simple products
    published: {
      type: Boolean,
      default: false,
      required: function () { return this.product_structure === 'simple'; },
      select: function () { return this.product_structure === 'simple'; }
    },
    isNewArrival: { type: Boolean, default: false }
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
);

// Pre-save hook to set status, validate variant SKUs, and auto-generate meta tags
productSchema.pre('save', function (next) {
  // Digital products are always available (no stock management)
  if (this.product_type === 'digital') {
    this.status = 'selling';
  }
  // Set status for physical products based on baseStock and minStock for simple products
  // For variant products, status is determined by variants
  else if (this.product_structure === 'simple') {
    if (this.baseStock !== undefined && this.minStock !== undefined) {
      if (this.baseStock <= this.minStock) {
        this.status = 'out_of_stock';
      } else {
        this.status = 'selling';
      }
    } else {
      // If stock values are not set, mark as draft (not ready for selling)
      this.status = 'draft';
    }
  } else if (this.product_structure === 'variant') {
    // For variant products, ensure main product status/published are not set
    if (this.product_structure === 'variant') {
      // These will be automatically excluded from queries due to the schema definition
      // but we'll explicitly set them to undefined to be safe
      this.status = undefined;
      this.published = undefined;
    }
  }

  // Ensure that if status is 'draft', published is false
  if (this.status === 'draft') {
    this.published = false;
  }

  // Special handling for out_of_stock status - can be published but not purchasable
  if (this.status === 'out_of_stock' && this.published === false) {
    this.published = true; // Allow publishing out-of-stock products
  }

  // Auto-generate meta tags based on product details (only if not manually set)
  if (this.name && this.slug) {
    // Initialize seo object if it doesn't exist, preserving any existing values
    if (!this.seo) {
      this.seo = {};
    }

    // 1. Canonical URL based on product slug (always auto-generate)
    const baseUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://yourstore.com';
    this.seo.canonical = `${baseUrl}/products/${this.slug}`;

    // 2. Robots meta setting based on published status and stock status
    // Digital products don't have stock - they're always available
    let isInStock = false;

    if (this.product_type === 'digital') {
      // Digital products are always "in stock" (available for download)
      isInStock = true;
    } else if (this.product_structure === 'simple') {
      // Only check stock if both baseStock and minStock are defined
      if (this.baseStock !== undefined && this.minStock !== undefined) {
        isInStock = this.baseStock > this.minStock;
      } else {
        // If stock values are not set, product is in draft status - not in stock for SEO
        isInStock = false;
      }
    } else if (this.product_structure === 'variant' && this.product_variants) {
      // For variant products, check if any variant is published and in stock
      const hasAvailableVariant = this.product_variants.some(variant =>
        variant.published && variant.status === 'selling'
      );
      isInStock = hasAvailableVariant;

      // If no variants are available, ensure main product is not published
      if (!hasAvailableVariant) {
        this.published = false;
      }
    }

    // For variant products, consider them published if they have variants
    // For simple products, use the main product published field
    const isPublished = this.product_structure === 'variant'
      ? (this.product_variants && this.product_variants.length > 0)
      : (this.published !== false);

    if (isPublished && isInStock) {
      // Case 1: Product available - index, follow (page appears on Google)
      this.seo.robots = 'index,follow';
    } else if (isPublished && !isInStock) {
      // Case 2: Product out of stock but might return - noindex,follow
      this.seo.robots = 'noindex,follow';
    } else {
      // Case 3: Product unpublished/deleted - noindex,nofollow
      this.seo.robots = 'noindex,nofollow';
    }

    // 3. OG Title - use manual SEO title if provided, otherwise auto-generate
    if (!this.seo.ogTitle) {
      if (this.seo.title) {
        // Use manually set SEO title for ogTitle
        this.seo.ogTitle = this.seo.title.length > 60
          ? this.seo.title.substring(0, 57) + '...'
          : this.seo.title;
      } else {
        // Auto-generate from product name
        this.seo.ogTitle = this.name.length > 60
          ? this.name.substring(0, 57) + '...'
          : this.name;
      }
    }

    // 4. OG Description - use manual SEO description if provided, otherwise auto-generate
    if (!this.seo.ogDescription) {
      if (this.seo.description) {
        // Use manually set SEO description for ogDescription
        this.seo.ogDescription = this.seo.description.length > 157
          ? this.seo.description.substring(0, 154) + '...'
          : this.seo.description;
      } else if (this.description) {
        // Auto-generate from product description
        this.seo.ogDescription = this.description.length > 157
          ? this.description.substring(0, 154) + '...'
          : this.description;
      } else {
        // Auto-generate default message
        this.seo.ogDescription = `Discover ${this.name} - quality product available now!`;
      }
    }

    // 5. OG Image - use manual if provided, otherwise check variant images first, then main product image
    if (!this.seo.ogImage) {
      // First, check if any variant has images (for variant-specific OG image)
      if (this.product_variants && this.product_variants.length > 0) {
        for (const variant of this.product_variants) {
          if (variant.images && variant.images.length > 0) {
            this.seo.ogImage = variant.images[0];
            break; // Use first variant's first image
          }
        }
      }

      // If no variant images found, use main product image
      if (!this.seo.ogImage && this.image_url && this.image_url.length > 0) {
        this.seo.ogImage = this.image_url[0];
      }
    }
  }

  // Set status for each variant based on their stock and minStock
  if (this.product_variants && this.product_variants.length > 0) {
    this.product_variants.forEach(variant => {
      if (variant.stock !== undefined && variant.minStock !== undefined) {
        if (variant.stock <= variant.minStock) {
          variant.status = 'out_of_stock';
        } else {
          variant.status = 'selling';
        }
      } else {
        // If stock values are not set for variant, set to draft (same as simple products)
        variant.status = 'draft'; // Variants without stock config should be draft
      }

      // Ensure that if variant status is 'draft', published is false
      // Out-of-stock variants can still be published (visible but not purchasable)
      if (variant.status === 'draft') {
        variant.published = false;
      }
    });

    // Validate variant SKUs are unique within the product
    const skus = this.product_variants.map(v => v.sku);
    const uniqueSkus = new Set(skus);

    if (skus.length !== uniqueSkus.size) {
      return next(new Error('Duplicate variant SKUs detected within the product'));
    }
  }

  next();
});

// Add validation for digital products
productSchema.pre('validate', function (next) {
  if (this.product_type === 'digital') {
    // For digital products, digital fields are required but can be set later
    // Allow creation without file initially - files can be uploaded via separate endpoint
    if (this.file_path && (!this.file_size || this.file_size <= 0)) {
      return next(new Error('Digital products must have a valid file size when file_path is provided'));
    }
    if (this.file_size && this.file_size > 0 && !this.file_path) {
      return next(new Error('Digital products must have a file path when file_size is provided'));
    }
    if (this.download_format && !this.file_path) {
      return next(new Error('Digital products must have a file path when download_format is provided'));
    }
    if (this.license_type && !this.file_path) {
      return next(new Error('Digital products must have a file path when license_type is provided'));
    }
  } else if (this.product_type === 'physical') {
    // For physical products, digital fields should not be required
    // but if present, they should be valid
    if (this.file_path || this.file_size || this.download_format || this.license_type || this.download_limit) {
      console.warn('Physical product has digital product fields set - this may not be intended');
    }
  }
  next();
});

module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);