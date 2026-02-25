const express = require("express");
const Product = require("../models/Product.js");
const Category = require("../models/Category.js");
const Stock = require("../models/Stock.js");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const router = express.Router();

// Use Firebase upload middleware
const { upload } = require('../middleware/upload');

// Upload middleware for digital files - using any() to capture all file fields
const uploadDigitalFile = upload.any();

// HELPER: Stock validation for publish toggle
function validateStockForPublish(product, isPublishing) {
  // Digital products don't need stock validation
  if (product.product_type === 'digital') {
    return {
      canPublish: true,
      status: 'selling',
      published: isPublishing,
      message: isPublishing ? '✅ Digital product published.' : '🗃️ Digital product archived.',
      stockInfo: 'Digital product - no stock required'
    };
  }

  // Variant products - check if any variant is available
  if (product.product_structure === 'variant') {
    if (product.product_variants && product.product_variants.length > 0) {
      const availableVariants = product.product_variants.filter(v => v.published && v.status === 'selling');
      const hasStock = availableVariants.some(v => v.stock > 0);

      if (isPublishing) {
        // Toggle ON - allow publishing but set status based on stock
        if (availableVariants.length === 0) {
          // No available variants but still allow publishing as out_of_stock
          return {
            canPublish: true,
            status: 'out_of_stock',
            published: true,
            message: `⚠️ Product published but marked as out of stock. No variants have stock.`,
            stockInfo: `No variants with stock (${product.product_variants.length} total variants)`
          };
        } else {
          // Has available variants - can publish
          const stockInfo = availableVariants.map(v => `${v.name}: ${v.stock}/${v.minStock}`).join(', ');
          return {
            canPublish: true,
            status: hasStock ? 'selling' : 'out_of_stock',
            published: true,
            message: hasStock
              ? `✅ Product published. Available variants: ${stockInfo}`
              : `⚠️ Product published but marked as out of stock. No variants have sufficient stock.`,
            stockInfo: stockInfo
          };
        }
      } else {
        // Toggle OFF - always allow with confirmation
        const stockInfo = product.product_variants.map(v => `${v.name}: ${v.stock}/${v.minStock}`).join(', ');
        return {
          canPublish: true,
          status: 'archived',
          published: false,
          message: `🗃️ Product archived. Current variant stock: ${stockInfo}. Are you sure?`,
          stockInfo: stockInfo
        };
      }
    } else {
      // No variants - cannot publish
      return {
        canPublish: false,
        status: 'draft',
        published: false,
        message: '⚠️ Please add variants before publishing.',
        stockInfo: 'No variants configured'
      };
    }
  }

  // Simple products - check baseStock and minStock
  if (product.product_structure === 'simple') {
    const baseStock = product.baseStock || 0;
    const minStock = product.minStock || 0;

    if (isPublishing) {
      // Toggle ON scenarios
      if (baseStock > 0 && minStock > 0) {
        // Has both stock and minStock - allow publish
        return {
          canPublish: true,
          status: 'selling',
          published: true,
          message: `✅ Product published. Stock: ${baseStock} / Min: ${minStock}.`,
          stockInfo: `${baseStock}/${minStock}`
        };
      } else if (baseStock === 0) {
        // Has stock = 0 but trying to publish - allow but warn (out_of_stock)
        return {
          canPublish: true,
          status: 'out_of_stock',
          published: true,
          message: `⚠️ Product is visible but currently out of stock.`,
          stockInfo: `${baseStock}/${minStock}`
        };
      } else {
        // Missing stock or minStock - block publish
        return {
          canPublish: false,
          status: 'draft',
          published: false,
          message: `⚠️ Please add Base Stock and Minimum Stock before publishing.`,
          stockInfo: `Base: ${baseStock}, Min: ${minStock}`
        };
      }
    } else {
      // Toggle OFF - always allow with confirmation
      return {
        canPublish: true,
        status: 'archived',
        published: false,
        message: `🗃️ Product archived. Current stock: ${baseStock} / Min: ${minStock}. Are you sure?`,
        stockInfo: `${baseStock}/${minStock}`
      };
    }
  }

  // Fallback - shouldn't reach here
  return {
    canPublish: false,
    status: 'draft',
    published: false,
    message: 'Unable to determine stock status.',
    stockInfo: 'Unknown product structure'
  };
}

function transformVariantsForDB(variantsData, baseSKU, costPrice, salesPrice, variantImagesMap = {}) {
  if (!variantsData || !variantsData.combinations || variantsData.combinations.length === 0) {
    console.log('🚨 BACKEND: No variants to transform');
    return [];
  }

  console.log('🚨 BACKEND: === TRANSFORMING VARIANTS ===');
  console.log('🚨 BACKEND: variantsData:', JSON.stringify(variantsData, null, 2));
  console.log('🚨 BACKEND: baseSKU:', baseSKU);
  console.log('🚨 BACKEND: costPrice:', costPrice);
  console.log('🚨 BACKEND: salesPrice:', salesPrice);
  console.log('🚨 BACKEND: variantImagesMap:', variantImagesMap);

  const transformedVariants = variantsData.combinations.map((combo, index) => {
    // Generate SKU if needed
    let sku = combo.sku;
    if (!sku || variantsData.autoGenerateSKU) {
      const attributeValues = Object.entries(combo.attributes || {})
        .filter(([_, value]) => value)
        .map(([key, value]) => String(value).substring(0, 3).toUpperCase())
        .join('-');

      sku = attributeValues ? `${baseSKU.toUpperCase()}-${attributeValues}` : `${baseSKU.toUpperCase()}-${index}`;
    }

    // Ensure SKU is uppercase
    sku = sku.toUpperCase();

    // Use fallback values in this order:
    // 1. combo.costPrice (camelCase - what frontend sends)
    // 2. combo.cost_price (snake_case - legacy)
    // 3. costPrice parameter (base product cost)
    // 4. 0 (default)
    const variantCostPrice = combo.costPrice ?? combo.cost_price ?? costPrice ?? 0;
    const variantSellingPrice = combo.salesPrice ?? combo.selling_price ?? combo.sellingPrice ?? salesPrice ?? 0;

    // Use images from combo.images (Firebase URLs are already there from frontend)
    let variantImages = combo.images || [];

    // Also add any newly uploaded files from variantImagesMap (for local file uploads)
    if (variantImagesMap[index] && variantImagesMap[index].length > 0) {
      variantImages = [...variantImages, ...variantImagesMap[index]];
    }

    // Process attributes - store all attributes directly in the Map
    const processedAttributes = new Map();

    // Handle all attributes (both known and custom)
    if (combo.attributes) {
      Object.entries(combo.attributes).forEach(([key, value]) => {
        processedAttributes.set(key, value);
      });
    }

    // Convert Map to plain object for MongoDB storage
    const attributesObject = {};
    processedAttributes.forEach((value, key) => {
      attributesObject[key] = value;
    });

    // Determine variant status based on stock and published state
    let variantStatus = 'draft';
    const variantStock = combo.stock !== undefined ? Number(combo.stock) : 0;
    const variantPublished = combo.published !== undefined ? combo.published : true;

    if (variantPublished) {
      if (variantStock > 0) {
        variantStatus = 'selling'; // Only 'selling' or 'out_of_stock' are valid enum values
      } else {
        variantStatus = 'out_of_stock';
      }
    }

    const transformedVariant = {
      name: combo.name,
      sku: sku,
      slug: combo.slug,
      cost_price: Number(variantCostPrice),
      selling_price: Number(variantSellingPrice),
      ...(combo.stock !== undefined && { stock: Number(combo.stock) }),
      ...(combo.minStock !== undefined && { minStock: Number(combo.minStock) }),
      images: variantImages,
      attributes: attributesObject,
      published: variantPublished,
      status: variantStatus
    };

    return transformedVariant;
  });

  console.log('🚨 BACKEND: === TRANSFORMATION COMPLETE ===');
  console.log('🚨 BACKEND: Total transformed variants:', transformedVariants.length);

  return transformedVariants;
}

// Test endpoint
router.get("/test1", (req, res) => {
  console.log('Test1 endpoint hit');
  res.json({
    success: true,
    message: "Test endpoint working"
  });
});

// STATIC FILE SERVING for product images
router.get("/uploads/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: "Image not found" });
  }

  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };

  res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
  res.setHeader("Cache-Control", "public, max-age=31536000");
  res.sendFile(filePath);
});

// GET unique colors available in products
router.get("/colors", async (req, res) => {
  try {
    const colorSet = new Set();

    // Get colors from the product color field (only for products that are selling)
    const productColors = await Product.distinct("color", {
      published: true,
      status: "selling",
      color: { $exists: true, $ne: "" }
    });
    productColors.forEach(color => {
      if (color) colorSet.add(color.toLowerCase());
    });

    // Get colors from variant attributes (only for variants that are selling)
    const productsWithVariants = await Product.find({
      product_structure: "variant",
      "product_variants": {
        $elemMatch: {
          published: true,
          status: "selling"
        }
      }
    }).select("product_variants");

    productsWithVariants.forEach(product => {
      if (product.product_variants && Array.isArray(product.product_variants)) {
        product.product_variants.forEach(variant => {
          if (variant.published && variant.status === "selling" && variant.attributes) {
            // Convert Map to plain object if needed
            let attributes = variant.attributes;
            if (attributes instanceof Map) {
              const attributesObj = {};
              attributes.forEach((value, key) => {
                attributesObj[key] = value;
              });
              attributes = attributesObj;
            } else if (typeof attributes === 'object') {
              // Already a plain object, convert to ensure consistency
              const attributesObj = {};
              Object.entries(attributes).forEach(([key, value]) => {
                attributesObj[key] = value;
              });
              attributes = attributesObj;
            }

            // Check for color in attributes (case-insensitive)
            const colorKeys = ['color', 'Color', 'colour', 'Colour'];
            colorKeys.forEach(key => {
              if (attributes[key]) {
                colorSet.add(attributes[key].toLowerCase());
              }
            });
          }
        });
      }
    });

    // Convert Set to sorted array with proper capitalization
    const validColors = Array.from(colorSet)
      .filter(c => c)
      .map(c => c.charAt(0).toUpperCase() + c.slice(1))
      .sort();

    console.log('Colors endpoint - found colors:', validColors);
    res.json({ success: true, data: validColors });
  } catch (err) {
    console.error("Error fetching colors:", err);
    res.status(500).json({ success: false, error: "Failed to fetch colors" });
  }
});

// GET search suggestions (minimal data for fast autocomplete)
router.get("/suggestions", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) {
      return res.json({ success: true, data: [] });
    }

    const searchQuery = query.trim();

    // Find products matching the query
    const products = await Product.find(
      {
        published: true,
        $or: [
          { name: { $regex: searchQuery, $options: "i" } },
          { tags: { $regex: searchQuery, $options: "i" } }
        ]
      },
      { name: 1, slug: 1, image_url: 1, selling_price: 1, product_structure: 1, product_variants: 1 }
    ).limit(8);

    // Transform products to include first image and variant price if needed
    const suggestions = products.map(product => {
      let image = "";
      if (product.image_url && product.image_url.length > 0) {
        image = product.image_url[0];
      }

      let price = product.selling_price;
      if (product.product_structure === 'variant' && product.product_variants && product.product_variants.length > 0) {
        // Find first published variant price
        const firstVariant = product.product_variants.find(v => v.published);
        if (firstVariant) {
          price = firstVariant.selling_price;
          if (firstVariant.images && firstVariant.images.length > 0) {
            image = firstVariant.images[0];
          }
        }
      }

      // Ensure image URL is absolute if it's a local path
      if (image && !image.startsWith('http') && !image.startsWith('/uploads')) {
        image = `/uploads/products/${image}`;
      }

      return {
        id: product._id,
        name: product.name,
        slug: product.slug,
        image: image,
        price: price,
        type: 'product'
      };
    });

    // Also suggest categories
    const categories = await Category.find(
      { name: { $regex: searchQuery, $options: "i" } },
      { name: 1, slug: 1 }
    ).limit(3);

    const categorySuggestions = categories.map(cat => ({
      id: cat._id,
      name: cat.name,
      slug: cat.slug,
      type: 'category'
    }));

    res.json({
      success: true,
      data: [...categorySuggestions, ...suggestions]
    });
  } catch (err) {
    console.error("Suggestions API Error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch suggestions" });
  }
});


// GET all products with pagination, search, and filtering
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      subcategory,
      priceSort,
      status,
      published,
      dateSort,
      productType,
      color,
      isNewArrival,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (category) {
      try {
        const categoryDoc = await Category.findOne({ slug: category });
        if (categoryDoc) {
          const Subcategory = require("../models/Subcategory.js");
          const subcategories = await Subcategory.find({ category_id: categoryDoc._id }).select('_id');
          const subcategoryIds = subcategories.map(sub => sub._id);
          if (subcategoryIds.length > 0) {
            filter["categories.subcategories"] = { $in: subcategoryIds };
          }
        }
      } catch (categoryError) {
        console.error("Error finding category:", categoryError);
      }
    }

    if (subcategory && subcategory !== 'all') {
      try {
        const Subcategory = require("../models/Subcategory.js");
        const subcategoryDoc = await Subcategory.findOne({ slug: subcategory });
        if (subcategoryDoc) {
          filter["categories.subcategories"] = subcategoryDoc._id;
        }
      } catch (subcategoryError) {
        console.error("Error finding subcategory:", subcategoryError);
      }
    }

    if (productType && productType !== 'all') {
      filter.product_type = productType;
    }

    if (isNewArrival !== undefined) {
      filter.isNewArrival = isNewArrival === "true";
    }

    if (status) {
      filter.status = status;
      // When filtering by a specific status, don't layer on a published constraint
      // unless explicitly requested.
      if (published !== undefined) {
        filter.published = published === "true";
      }
    } else if (published !== undefined) {
      filter.published = published === "true";
    } else {
      // No status, no published param — distinguish admin vs client via JWT
      // If the request carries a valid STAFF token, admins see all products (draft, unpublished, etc.)
      // Otherwise (client, unauthenticated) — only published products are shown.
      let isStaffRequest = false;
      try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.split(' ')[1];
          const decoded = require('jsonwebtoken').decode(token); // decode only, no verify needed here
          // Staff tokens carry a 'role' field; customer tokens do not
          if (decoded && decoded.role) {
            isStaffRequest = true;
          }
        }
      } catch (_) { /* ignore token parse errors — fall through to published:true */ }

      if (!isStaffRequest) {
        filter.published = true;
      }
      // If isStaffRequest, no published filter → admin sees everything
    }

    if (color) {
      const colorRegex = { $regex: color, $options: "i" };
      // Combine with existing $or if it exists (from search)
      const colorQuery = [
        { color: colorRegex },
        { "product_variants.attributes.color": colorRegex },
        { "product_variants.attributes.Color": colorRegex },
        { "product_variants.attributes.colour": colorRegex },
        { "product_variants.attributes.Colour": colorRegex }
      ];

      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: colorQuery }
        ];
        delete filter.$or;
      } else {
        filter.$or = colorQuery;
      }
    }

    let sort = {};
    if (priceSort) {
      sort.selling_price = priceSort === "lowest-first" ? 1 : -1;
    } else if (dateSort) {
      const [field, direction] = dateSort.split("-");
      const sortField = field === "added" ? "created_at" : "updated_at";
      sort[sortField] = direction === "asc" ? 1 : -1;
    } else {
      sort.created_at = -1;
    }

    // Debug logging
    console.log("GET /products query:", req.query);
    console.log("GET /products built filter:", JSON.stringify(filter, null, 2));

    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate({ path: "categories.category", select: "name slug" })
      .populate({ path: "categories.subcategories", select: "name" });

    const total = await Product.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    const productsData = products.map(product => {
      const productObj = product.toObject();
      if (productObj.product_variants && productObj.product_variants.length > 0) {
        productObj.product_variants = productObj.product_variants.map(variant => {
          if (variant.attributes && variant.attributes instanceof Map) {
            const attributesObj = {};
            variant.attributes.forEach((value, key) => { attributesObj[key] = value; });
            return { ...variant, attributes: attributesObj };
          } else if (variant.attributes && typeof variant.attributes === 'object') {
            const attributesObj = {};
            Object.entries(variant.attributes).forEach(([key, value]) => { attributesObj[key] = value; });
            return { ...variant, attributes: attributesObj };
          }
          return variant;
        });
      }
      return productObj;
    });

    res.json({
      success: true,
      data: productsData,
      totalPages,
      currentPage: pageNum,
      prevPage: hasPrevPage ? pageNum - 1 : null,
      nextPage: hasNextPage ? pageNum + 1 : null,
      limit: limitNum,
      totalItems: total,
    });
  } catch (err) {
    console.error("Products API Error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch products" });
  }
});

// GET a product by slug
router.get("/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug || typeof slug !== 'string' || slug.trim() === '') {
      return res.status(400).json({ success: false, error: "Product slug is required" });
    }
    const product = await Product.findOne({ slug: slug, published: true })
      .populate({ path: "categories.category", select: "name slug" })
      .populate({ path: "categories.subcategories", select: "name" });

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    const productObj = product.toObject();
    if (productObj.product_variants && productObj.product_variants.length > 0) {
      productObj.product_variants = productObj.product_variants.map(variant => {
        const variantWithImageUrl = variant.images ? { ...variant, image_url: variant.images } : variant;
        if (variantWithImageUrl.attributes && variantWithImageUrl.attributes instanceof Map) {
          const attributesObj = {};
          variantWithImageUrl.attributes.forEach((value, key) => { attributesObj[key] = value; });
          return { ...variantWithImageUrl, attributes: attributesObj };
        } else if (variantWithImageUrl.attributes && typeof variantWithImageUrl.attributes === 'object') {
          const attributesObj = {};
          Object.entries(variantWithImageUrl.attributes).forEach(([key, value]) => { attributesObj[key] = value; });
          return { ...variantWithImageUrl, attributes: attributesObj };
        }
        return variantWithImageUrl;
      });
    }

    res.json({ success: true, data: productObj });
  } catch (err) {
    console.error("Product by slug error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch product by slug" });
  }
});

// GET a product by id
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid product ID format" });
    }
    const product = await Product.findOne({ _id: req.params.id })
      .populate({ path: "categories.category", select: "name slug" })
      .populate({ path: "categories.subcategories", select: "name" });

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    const productObj = product.toObject();
    if (productObj.product_variants && productObj.product_variants.length > 0) {
      productObj.product_variants = productObj.product_variants.map(variant => {
        const variantWithImageUrl = variant.images ? { ...variant, image_url: variant.images } : variant;
        if (variantWithImageUrl.attributes && variantWithImageUrl.attributes instanceof Map) {
          const attributesObj = {};
          variantWithImageUrl.attributes.forEach((value, key) => { attributesObj[key] = value; });
          return { ...variantWithImageUrl, attributes: attributesObj };
        } else if (variantWithImageUrl.attributes && typeof variantWithImageUrl.attributes === 'object') {
          const attributesObj = {};
          Object.entries(variantWithImageUrl.attributes).forEach(([key, value]) => { attributesObj[key] = value; });
          return { ...variantWithImageUrl, attributes: attributesObj };
        }
        return variantWithImageUrl;
      });
    }

    res.json({ success: true, data: productObj });
  } catch (err) {
    console.error("Product by ID error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch product" });
  }
});

// POST a new product
router.post("/", uploadDigitalFile, async (req, res) => {
  try {
    console.log('=== POST PRODUCT DEBUG ===');

    // Initialize variables used by the following logic
    let allImageUrls = [];
    let digitalFile = null;
    let variantImagesMap = {};
    const productType = req.body.product_type || 'physical';

    // Parse JSON fields
    let categories = [];
    if (req.body.categories) {
      try {
        categories = typeof req.body.categories === 'string'
          ? JSON.parse(req.body.categories)
          : req.body.categories;
      } catch (e) {
        console.error('Error parsing categories:', e);
      }
    }

    let tags = [];
    if (req.body.tags) {
      try {
        tags = typeof req.body.tags === 'string'
          ? JSON.parse(req.body.tags)
          : req.body.tags;
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }

    let variantsData = null;
    const variantsPayload = req.body.variants || req.body.product_variants;

    if (variantsPayload) {
      try {
        variantsData = typeof variantsPayload === 'string'
          ? JSON.parse(variantsPayload)
          : variantsPayload;
      } catch (e) {
        console.error('Error parsing variants:', e);
      }
    }

    let hasFirebaseUrls = false;
    if (variantsData && variantsData.combinations) {
      variantsData.combinations.forEach((combo, index) => {
        console.log(`Variant ${index} images data:`, {
          hasImages: !!combo.images,
          imagesType: typeof combo.images,
          imagesLength: combo.images?.length || 0,
          images: combo.images
        });

        if (combo.images && Array.isArray(combo.images)) {
          // Check if any images are Firebase URLs (HTTP URLs)
          const httpUrls = combo.images.filter(img => typeof img === 'string' && img.startsWith('http'));
          if (httpUrls.length > 0) {
            hasFirebaseUrls = true;
            console.log(`🚨 BACKEND: Found ${httpUrls.length} Firebase URLs for variant ${index} - skipping variantImagesMap population`);
          }
        }
      });
    }

    // Only populate variantImagesMap if no Firebase URLs were found
    if (!hasFirebaseUrls) {
      console.log('🚨 BACKEND: No Firebase URLs found, populating variantImagesMap from variantsData');
      if (variantsData && variantsData.combinations) {
        variantsData.combinations.forEach((combo, index) => {
          if (combo.images && Array.isArray(combo.images)) {
            // Filter out any non-string values
            const imageUrls = combo.images.filter(img => typeof img === 'string');
            if (imageUrls.length > 0) {
              variantImagesMap[index] = imageUrls;
              console.log(`🚨 BACKEND: Added ${imageUrls.length} local URLs to variantImagesMap[${index}]`);
            }
          }
        });
      }
    } else {
      console.log('🚨 BACKEND: Firebase URLs found, keeping variantImagesMap empty to prevent duplication');
    }

    if (req.files && Array.isArray(req.files)) {
      const filesByField = {};
      req.files.forEach(file => {
        if (!filesByField[file.fieldname]) {
          filesByField[file.fieldname] = [];
        }
        filesByField[file.fieldname].push(file);
      });

      // Process images
      const imageFields = Object.keys(filesByField).filter(key =>
        key.startsWith('images[') || key === 'images'
      );

      imageFields.forEach(key => {
        filesByField[key].forEach(file => {
          allImageUrls.push(file.firebaseUrl || `/uploads/products/${file.filename}`);
        });
      });

      // Process variant images (save to local uploads folder)
      if (Object.keys(variantImagesMap).length === 0) {
        const variantImageFields = Object.keys(filesByField).filter(key =>
          key.startsWith('variantImages[')
        );

        variantImageFields.forEach(key => {
          const match = key.match(/variantImages\[(\d+)\]\[(\d+)\]/);
          if (match) {
            const comboIndex = parseInt(match[1]);

            if (!variantImagesMap[comboIndex]) {
              variantImagesMap[comboIndex] = [];
            }

            const file = filesByField[key][0];
            if (file) {
              // Use Firebase URL if available (preferred), otherwise fall back to local path
              variantImagesMap[comboIndex].push(file.firebaseUrl || `/uploads/products/${file.filename}`);
            }
          }
        });
      }

      // Process digital file
      if (filesByField.fileUpload && filesByField.fileUpload.length > 0) {
        digitalFile = filesByField.fileUpload[0];
      }
    }

    // If images were already uploaded elsewhere (e.g., Firebase) the frontend sends their URLs
    if (allImageUrls.length === 0 && req.body.image_url) {
      try {
        const providedImageUrls = typeof req.body.image_url === 'string'
          ? JSON.parse(req.body.image_url)
          : req.body.image_url;

        if (Array.isArray(providedImageUrls) && providedImageUrls.length > 0) {
          allImageUrls = providedImageUrls;
          console.log('✅ Using provided image URLs from request body:', allImageUrls.length);
        }
      } catch (error) {
        console.error('❌ Failed to parse provided image_url payload:', error);
      }
    }

    console.log('Total images:', allImageUrls.length);
    console.log('Digital file:', digitalFile ? digitalFile.filename : 'None');

    console.log('=== BEFORE BUILDING PRODUCT DATA ===');
    console.log('req.body.productStructure:', req.body.productStructure);
    console.log('req.body.product_structure:', req.body.product_structure);

    // Determine product structure first
    const productStructure = req.body.product_structure || req.body.productStructure || 'simple';
    console.log('Determined productStructure:', productStructure);

    // Build product data
    const productData = {
      name: req.body.name,
      slug: req.body.slug,
      description: req.body.description,
      product_type: productType,
      product_structure: productStructure,
      sku: req.body.sku ? req.body.sku.toUpperCase() : undefined,
      categories: categories,
      // For variant products, don't set cost_price and selling_price (variants handle pricing)
      // For simple products, these are required
      cost_price: productStructure === 'simple' ? parseFloat(req.body.cost_price || req.body.costPrice) : undefined,
      selling_price: productStructure === 'simple' ? parseFloat(req.body.selling_price || req.body.salesPrice) : undefined,
      image_url: allImageUrls,
      tags: tags,
      // For variant products, don't set published - variants handle their own
      ...(productStructure !== 'variant' && { published: req.body.published === 'true' }),
    };

    // Only set stock-related fields for physical products
    if (productType === 'physical') {
      if (req.body.stock !== undefined) {
        productData.baseStock = parseInt(req.body.stock);
      }
      if (req.body.min_stock_threshold !== undefined) {
        productData.minStock = parseInt(req.body.min_stock_threshold);
      }
    }
    // Digital products don't need stock fields - they're always available

    // Generate unique slug if needed
    if (productData.slug) {
      let baseSlug = productData.slug;
      let slugCounter = 1;
      let finalSlug = baseSlug;

      // Check if slug already exists and generate unique one if needed
      while (await Product.findOne({ slug: finalSlug, _id: { $ne: null } })) {
        finalSlug = `${baseSlug}-${slugCounter}`;
        slugCounter++;
      }

      productData.slug = finalSlug;
      console.log('Generated unique slug:', finalSlug);
    }

    // Add optional fields BEFORE creating product instance
    if (req.body.weight) productData.weight = parseFloat(req.body.weight);
    if (req.body.color) productData.color = req.body.color;
    if (req.body.size) productData.size = req.body.size;
    if (req.body.material) productData.material = req.body.material;
    if (req.body.brand) productData.brand = req.body.brand;
    if (req.body.warranty) productData.warranty = req.body.warranty;
    if (req.body.isCodAvailable !== undefined) productData.isCodAvailable = req.body.isCodAvailable === 'true' || req.body.isCodAvailable === true;
    if (req.body.isFreeShipping !== undefined) productData.isFreeShipping = req.body.isFreeShipping === 'true' || req.body.isFreeShipping === true;
    if (req.body.showRatings !== undefined) productData.showRatings = req.body.showRatings === 'true' || req.body.showRatings === true;

    // Digital product fields - map frontend camelCase to backend snake_case
    // IMPORTANT: Set these BEFORE creating the Product instance
    if (productType === 'digital') {
      if (digitalFile) {
        productData.file_path = `/uploads/products/${digitalFile.filename}`;
        productData.file_size = digitalFile.size;
        console.log('✅ Set file_path:', productData.file_path);
        console.log('✅ Set file_size from uploaded file:', productData.file_size);
      }

      // Map frontend fields (camelCase) to backend fields (snake_case)
      const downloadFormat = req.body.download_format || req.body.downloadFormat;
      const licenseType = req.body.license_type || req.body.licenseType;
      const downloadLimit = req.body.download_limit || req.body.downloadLimit;
      const fileSize = req.body.file_size || req.body.fileSize;

      if (downloadFormat) {
        productData.download_format = downloadFormat;
        console.log('✅ Set download_format:', downloadFormat);
      }
      if (licenseType) {
        productData.license_type = licenseType;
        console.log('✅ Set license_type:', licenseType);
      }
      if (downloadLimit) {
        productData.download_limit = parseInt(downloadLimit);
        console.log('✅ Set download_limit:', downloadLimit);
      }
      // If file_size was sent from frontend (in MB), use it
      if (fileSize && !digitalFile) {
        productData.file_size = parseFloat(fileSize);
        console.log('✅ Set file_size from frontend:', fileSize);
      }

      console.log('=== DIGITAL PRODUCT FIELDS SET ===');
      console.log('file_path:', productData.file_path);
      console.log('file_size:', productData.file_size);
      console.log('download_format:', productData.download_format);
      console.log('license_type:', productData.license_type);
      console.log('download_limit:', productData.download_limit);
    }

    console.log('=== PRODUCT DATA BEING SAVED ===');
    console.log('product_structure in productData:', productData.product_structure);

    // Create product instance AFTER all fields are set in productData
    const product = new Product(productData);

    // Ensure product_structure is set correctly before any validation
    product.product_structure = productStructure;

    console.log('=== PRODUCT INSTANCE CREATED ===');
    console.log('product.product_structure:', product.product_structure);

    // SEO fields - only set non-empty values
    // Define seoKeywords if not defined
    const seoKeywords = req.body.seo_keywords ? (typeof req.body.seo_keywords === 'string' ? JSON.parse(req.body.seo_keywords) : req.body.seo_keywords) : [];

    if (req.body.seo_title || req.body.seo_description || seoKeywords.length > 0 || req.body.seo_canonical || req.body.seo_robots || req.body.seo_og_title || req.body.seo_og_description || req.body.seo_og_image) {
      productData.seo = {};
      console.log('=== SETTING SEO FIELDS ===');
      console.log('seo_title:', req.body.seo_title);
      console.log('seo_description:', req.body.seo_description);
      console.log('seoKeywords:', seoKeywords);

      // Only set fields that have actual values (not empty strings)
      if (req.body.seo_title && req.body.seo_title.trim() !== '') {
        productData.seo.title = req.body.seo_title;
        console.log('✅ Set seo.title:', req.body.seo_title);
      }
      if (req.body.seo_description && req.body.seo_description.trim() !== '') {
        productData.seo.description = req.body.seo_description;
        console.log('✅ Set seo.description:', req.body.seo_description);
      }
      if (seoKeywords && seoKeywords.length > 0) {
        productData.seo.keywords = seoKeywords;
        console.log('✅ Set seo.keywords:', seoKeywords);
      }
      if (req.body.seo_canonical && req.body.seo_canonical.trim() !== '') {
        productData.seo.canonical = req.body.seo_canonical;
        console.log('✅ Set seo.canonical:', req.body.seo_canonical);
      }
      if (req.body.seo_robots) {
        productData.seo.robots = req.body.seo_robots;
        console.log('✅ Set seo.robots:', req.body.seo_robots);
      }
      if (req.body.seo_og_title && req.body.seo_og_title.trim() !== '') {
        productData.seo.ogTitle = req.body.seo_og_title;
        console.log('✅ Set seo.ogTitle:', req.body.seo_og_title);
      }
      if (req.body.seo_og_description && req.body.seo_og_description.trim() !== '') {
        productData.seo.ogDescription = req.body.seo_og_description;
        console.log('✅ Set seo.ogDescription:', req.body.seo_og_description);
      }
      if (req.body.seo_og_image && req.body.seo_og_image.trim() !== '') {
        productData.seo.ogImage = req.body.seo_og_image;
        console.log('✅ Set seo.ogImage:', req.body.seo_og_image);
      }

      // Also set on the product instance to ensure it's saved
      product.seo = productData.seo;
      console.log('✅ Set seo on product instance:', product.seo);
    } else {
      console.log('❌ No SEO fields to set - condition not met');
      console.log('seo_title:', req.body.seo_title, 'seo_description:', req.body.seo_description, 'seoKeywords length:', seoKeywords.length);
    }

    // Transform and add variants
    // Update the variant processing code
    if (variantsData && variantsData.combinations && variantsData.combinations.length > 0) {
      console.log('=== PROCESSING VARIANTS ===');
      console.log('Raw variantsData:', JSON.stringify(variantsData, null, 2));

      // Process any Firebase URLs that might be in the request body
      if (req.body.variantImageUrls) {
        try {
          const variantImageUrls = typeof req.body.variantImageUrls === 'string'
            ? JSON.parse(req.body.variantImageUrls)
            : req.body.variantImageUrls;

          console.log('=== PROCESSING FIREBASE VARIANT IMAGES ===');
          console.log('Variant image URLs from frontend:', JSON.stringify(variantImageUrls, null, 2));

          // Add Firebase URLs directly to the variantsData.combinations
          Object.entries(variantImageUrls).forEach(([index, urls]) => {
            const idx = parseInt(index);
            if (!isNaN(idx) && variantsData.combinations[idx]) {
              // Initialize images array if it doesn't exist
              if (!variantsData.combinations[idx].images) {
                variantsData.combinations[idx].images = [];
              }

              // Add the Firebase URLs to the variant's images
              const newUrls = Array.isArray(urls) ? urls : [urls];
              variantsData.combinations[idx].images = [
                ...variantsData.combinations[idx].images,
                ...newUrls
              ].filter(Boolean);

              console.log(`Added ${newUrls.length} images to variant ${idx}:`, variantsData.combinations[idx].images);
            }
          });
        } catch (e) {
          console.error('Error processing variant image URLs:', e);
        }
      }

      const transformedVariants = transformVariantsForDB(
        variantsData,
        req.body.sku || 'PROD',
        productData.cost_price,
        productData.selling_price,
        variantImagesMap
      );

      console.log('=== TRANSFORMED VARIANTS ===');
      console.log('Count:', transformedVariants.length);
      console.log('Sample variant before processing:', JSON.stringify(transformedVariants[0], null, 2));

      if (transformedVariants.length > 0) {
        // Ensure required fields are set for each variant
        const finalVariants = transformedVariants.map((variant, index) => {
          const finalVariant = {
            ...variant,
            status: variant.status || 'draft',
            published: variant.published !== undefined ? variant.published : true,
            stock: variant.stock || 0,
            minStock: variant.minStock || 0,
            images: Array.isArray(variant.images) ? variant.images.filter(Boolean) : [],
            attributes: variant.attributes || {},
            created_at: new Date(),
            updated_at: new Date()
          };

          console.log(`Variant ${index} final images:`, finalVariant.images);
          return finalVariant;
        });

        console.log('=== FINAL VARIANTS BEFORE SAVE ===');
        console.log(JSON.stringify(finalVariants, null, 2));

        // Assign the final variants to the product
        product.product_variants = finalVariants;
        productData.product_variants = finalVariants;
      }
    } else {
      console.log('No variants data found in request');
    }

    console.log('=== FINAL PRODUCT DATA ===');
    console.log('Variants count:', productData.product_variants ? productData.product_variants.length : 0);

    // product instance already created above

    console.log('=== BEFORE SAVE ===');
    console.log('Product instance seo object:', product.seo);
    console.log('Product variants:', product.product_variants ? product.product_variants.length : 0);
    if (productType === 'digital') {
      console.log('Digital product fields before save:', {
        file_path: product.file_path,
        file_size: product.file_size,
        download_format: product.download_format,
        license_type: product.license_type,
        download_limit: product.download_limit
      });
    }

    await product.save();

    console.log('=== AFTER SAVE ===');
    console.log('Saved product ID:', product._id);
    console.log('Saved product seo:', product.seo);
    console.log('Saved variants count:', product.product_variants ? product.product_variants.length : 0);
    if (productType === 'digital') {
      console.log('Digital product fields after save:', {
        file_path: product.file_path,
        file_size: product.file_size,
        download_format: product.download_format,
        license_type: product.license_type,
        download_limit: product.download_limit
      });
    }

    // Create stock entries for the product and its variants
    try {
      console.log('=== CREATING STOCK ENTRIES ===');

      // Find a staff member to use as lastUpdatedBy (use first available staff)
      let staffMember;
      try {
        const Staff = require("../models/Staff.js");
        staffMember = await Staff.findOne({ is_active: true }).sort({ created_at: 1 });
      } catch (staffError) {
        console.error('Error finding staff member for stock creation:', staffError);
      }

      const stockEntries = [];

      // Only create stock entries for physical products
      if (productType === 'physical') {
        // For variant products, only create stock entries for variants
        if (product.product_structure === 'variant') {
          // Create stock entries for all variants
          if (product.product_variants && product.product_variants.length > 0) {
            for (let i = 0; i < product.product_variants.length; i++) {
              const variant = product.product_variants[i];
              stockEntries.push({
                productId: product._id,
                variantId: variant._id,
                quantity: variant.stock !== undefined ? variant.stock : null,
                minStock: variant.minStock !== undefined ? variant.minStock : null,
                notes: `Initial stock for variant: ${variant.slug}`,
                lastUpdatedBy: staffMember ? staffMember._id : null
              });
            }
            console.log(`✅ Created ${product.product_variants.length} stock entries for variants of product ${product.name}`);
          } else {
            console.log('⚠️ No variants found for variant product');
          }
        } else {
          // For non-variant products, create stock entry for the base product
          stockEntries.push({
            productId: product._id,
            variantId: null,
            quantity: product.baseStock !== undefined ? product.baseStock : null,
            minStock: product.minStock !== undefined ? product.minStock : null,
            notes: "Initial stock from product creation",
            lastUpdatedBy: staffMember ? staffMember._id : null
          });
          console.log(`✅ Created stock entry for simple product ${product.name}`);
        }
      }

      if (stockEntries.length > 0) {
        await Stock.insertMany(stockEntries);
        console.log(`✅ Created ${stockEntries.length} stock entries for product ${product.name}`);
      } else {
        console.log('ℹ️ No stock entries created (digital product)');
      }
    } catch (stockError) {
      console.error('❌ Error creating stock entries:', stockError);
      // Don't fail the product creation if stock creation fails
      // The product was already saved successfully
    }

    res.status(201).json({
      success: true,
      data: product.toObject()
    });
  } catch (err) {
    console.error("Create product error:", err);

    if (err.code === 11000) {
      const keyPattern = err.keyPattern || {};
      const field = Object.keys(keyPattern)[0];

      let errorMessage = 'A duplicate value was detected.';
      if (field === 'sku') {
        errorMessage = 'This SKU is already in use. Please choose a different SKU.';
      } else if (field === 'slug') {
        errorMessage = 'This product name would create a duplicate URL slug. Please choose a different name.';
      } else if (field === 'variants.sku') {
        errorMessage = 'One of the variant SKUs is already in use. Please ensure all variant SKUs are unique.';
      }

      return res.status(400).json({
        success: false,
        error: errorMessage,
        field: field,
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }

    if (err.message && err.message.includes('Duplicate variant SKUs')) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate variant SKUs detected within the product. Each variant must have a unique SKU.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to create product",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
router.put("/:id", uploadDigitalFile, async (req, res) => {
  try {
    console.log('=== PUT PRODUCT DEBUG ===');
    console.log('Request body keys:', Object.keys(req.body));

    // Parse categories
    let categories = [];
    if (req.body.categories) {
      try {
        console.log('=== PUT: RAW CATEGORIES INPUT ===', req.body.categories);
        const parsedCategories = typeof req.body.categories === 'string'
          ? JSON.parse(req.body.categories)
          : req.body.categories;

        console.log('=== PUT: PARSED CATEGORIES ===', JSON.stringify(parsedCategories, null, 2));

        if (Array.isArray(parsedCategories)) {
          for (const cat of parsedCategories) {
            console.log('Processing category item:', cat);
            let categoryId = null;

            if (cat.categoryId) {
              if (typeof cat.categoryId === 'string' && cat.categoryId.length === 24 && /^[a-fA-F0-9]{24}$/.test(cat.categoryId)) {
                categoryId = cat.categoryId;
              }
            }
            else if (cat.category) {
              if (typeof cat.category === 'string' && cat.category.length === 24 && /^[a-fA-F0-9]{24}$/.test(cat.category)) {
                categoryId = cat.category;
              }
              else if (typeof cat.category === 'string') {
                try {
                  const Category = require("../models/Category.js");
                  const foundCategory = await Category.findOne({
                    $or: [{ slug: cat.category }, { name: cat.category }]
                  });

                  if (foundCategory) {
                    categoryId = foundCategory._id.toString();
                  } else {
                    console.log('Category lookup failed for:', cat.category);
                    continue;
                  }
                } catch (categoryError) {
                  console.error("Error finding category:", categoryError);
                  continue;
                }
              }
              else if (cat.category._id || cat.category.id) {
                categoryId = cat.category._id || cat.category.id;
              }
            }

            if (categoryId) {
              console.log('Resolved Category ID:', categoryId);
              let subcategories = [];

              if (cat.subcategoryIds && Array.isArray(cat.subcategoryIds)) {
                for (const subcatId of cat.subcategoryIds) {
                  if (typeof subcatId === 'string' && subcatId.length === 24 && /^[a-fA-F0-9]{24}$/.test(subcatId)) {
                    subcategories.push(subcatId);
                  }
                }
              }
              else if (cat.subcategories && Array.isArray(cat.subcategories)) {
                for (const subcat of cat.subcategories) {
                  if (typeof subcat === 'string' && subcat.length === 24 && /^[a-fA-F0-9]{24}$/.test(subcat)) {
                    subcategories.push(subcat);
                  } else if (typeof subcat === 'string') {
                    try {
                      const Subcategory = require("../models/Subcategory.js");
                      const foundSubcategory = await Subcategory.findOne({
                        $or: [{ slug: subcat }, { name: subcat }]
                      });

                      if (foundSubcategory) {
                        subcategories.push(foundSubcategory._id.toString());
                      }
                    } catch (subcategoryError) {
                      console.error("Error finding subcategory:", subcategoryError);
                    }
                  }
                }
              }

              console.log('Resolved Subcategories:', subcategories);
              categories.push({
                category: categoryId,
                subcategories: subcategories
              });
            } else {
              console.log('❌ Could not resolve Category ID for item:', cat);
            }
          }
        }
        console.log('=== PUT: FINAL CATEGORIES TO SAVE ===', JSON.stringify(categories, null, 2));
      } catch (e) {
        console.error("Error parsing categories JSON:", e);
      }
    }

    let tags = [];
    if (req.body.tags) {
      try {
        tags = JSON.parse(req.body.tags);
      } catch (e) {
        tags = Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags];
      }
    }

    let seoKeywords = [];
    if (req.body.seo_keywords) {
      try {
        seoKeywords = JSON.parse(req.body.seo_keywords);
      } catch (e) {
        console.error("Error parsing seoKeywords JSON:", e);
      }
    }

    let variantsData = null;
    if (req.body.product_variants) {
      try {
        variantsData = JSON.parse(req.body.product_variants);
        console.log('Parsed variants data for update:', JSON.stringify(variantsData, null, 2));
      } catch (e) {
        console.error("Error parsing variants JSON:", e);
      }
    }

    const productType = req.body.product_type || 'physical';

    // Process files
    let allImageUrls = [];
    let digitalFile = null;
    let variantImagesMap = {};

    if (req.files && Array.isArray(req.files)) {
      const filesByField = {};
      req.files.forEach(file => {
        if (!filesByField[file.fieldname]) {
          filesByField[file.fieldname] = [];
        }
        filesByField[file.fieldname].push(file);
      });

      const imageFields = Object.keys(filesByField).filter(key =>
        key.startsWith('images[') || key === 'images'
      );

      imageFields.forEach(key => {
        filesByField[key].forEach(file => {
          // Use Firebase URL if available (preferred), fall back to local path
          allImageUrls.push(file.firebaseUrl || `/uploads/products/${file.filename}`);
        });
      });

      // Add existing images if provided
      if (req.body.existing_images) {
        try {
          const existingImages = JSON.parse(req.body.existing_images);
          if (Array.isArray(existingImages)) {
            // Prepend existing images so they stay at the beginning (or append, depending on desired order)
            // Usually we want to keep the order. If the frontend sends the full order, we might need a different approach.
            // For now, let's assume existing images come first, then new uploads.
            allImageUrls = [...existingImages, ...allImageUrls];
          }
        } catch (e) {
          console.error("Error parsing existing_images:", e);
        }
      } else if (req.body.existing_images === "") {
        // Explicitly empty string means remove all existing images (if no new ones uploaded)
        // allImageUrls is already empty (or has new uploads), so we don't need to do anything special here
        // except NOT adding existing images.
      } else {
        // If existing_images is NOT present in the body at all, it might mean the frontend isn't sending it.
        // In a standard PUT, this might mean "don't change images".
        // But our logic usually implies "replace with what's sent".
        // To be safe and backward compatible:
        // If NO new images are uploaded AND existing_images is missing, we might want to keep current images?
        // However, the previous logic was "if allImageUrls.length > 0 updateData.image_url = allImageUrls".
        // So if we send nothing, it didn't update images.
        // Now we want to support deleting.
        // So the frontend MUST send `existing_images` (empty array) if it wants to delete all.
      }

      const variantImageFields = Object.keys(filesByField).filter(key =>
        key.startsWith('variantImages[')
      );

      variantImageFields.forEach(key => {
        const match = key.match(/variantImages\[(\d+)\]\[(\d+)\]/);
        if (match) {
          const comboIndex = parseInt(match[1]);

          if (!variantImagesMap[comboIndex]) {
            variantImagesMap[comboIndex] = [];
          }

          const file = filesByField[key][0];
          if (file) {
            // Use Firebase URL if available (preferred), fall back to local path
            variantImagesMap[comboIndex].push(file.firebaseUrl || `/uploads/products/${file.filename}`);
          }
        }
      });

      if (filesByField.fileUpload && filesByField.fileUpload.length > 0) {
        digitalFile = filesByField.fileUpload[0];
      }
    }

    // Determine product structure
    const productStructure = req.body.productStructure || req.body.product_structure;

    // Fetch the current product early to avoid initialization errors
    let productQuery = {};
    try {
      if (req.params.id && req.params.id.length === 24 && /^[a-fA-F0-9]{24}$/.test(req.params.id)) {
        productQuery._id = new mongoose.Types.ObjectId(req.params.id);
      } else {
        productQuery._id = req.params.id;
      }
    } catch (err) {
      productQuery._id = req.params.id;
    }

    const currentProduct = await Product.findOne(productQuery);
    if (!currentProduct) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    // Build update data
    const updateData = {
      updated_at: new Date()
    };

    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.slug !== undefined) updateData.slug = req.body.slug;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (productStructure) updateData.product_structure = productStructure;
    if (req.body.sku) updateData.sku = req.body.sku.toUpperCase();
    if (req.body.categories) updateData.categories = categories;

    if (productStructure === 'simple') {
      if (req.body.cost_price || req.body.costPrice) updateData.cost_price = parseFloat(req.body.cost_price || req.body.costPrice);
      if (req.body.selling_price || req.body.salesPrice) updateData.selling_price = parseFloat(req.body.selling_price || req.body.salesPrice);
    } else if (productStructure === 'variant') {
      updateData.cost_price = undefined;
      updateData.selling_price = undefined;
    }

    if (productType === 'physical') {
      const hasStockUpdate = req.body.stock !== undefined;
      const hasMinStockUpdate = req.body.min_stock_threshold !== undefined;

      if (hasStockUpdate) updateData.baseStock = parseInt(req.body.stock);
      if (hasMinStockUpdate) updateData.minStock = parseInt(req.body.min_stock_threshold);

      const isSimpleStructure = (productStructure || currentProduct?.product_structure) === 'simple';
      if (isSimpleStructure && (hasStockUpdate || hasMinStockUpdate)) {
        const effectiveBaseStock = hasStockUpdate
          ? updateData.baseStock
          : currentProduct?.baseStock;
        const effectiveMinStock = hasMinStockUpdate
          ? updateData.minStock
          : currentProduct?.minStock;

        if (typeof effectiveBaseStock === 'number') {
          if (effectiveBaseStock > (typeof effectiveMinStock === 'number' ? effectiveMinStock : 0)) {
            updateData.status = 'selling';
          } else if (effectiveBaseStock > 0) {
            updateData.status = 'low_stock';
          } else {
            updateData.status = 'out_of_stock';
          }
        }
      }
    } else if (productType === 'digital') {
      updateData.baseStock = 0;
      updateData.minStock = 0;
      updateData.status = 'selling';
      updateData.product_structure = 'simple';
    }

    if (allImageUrls.length > 0 || req.body.existing_images !== undefined) {
      updateData.image_url = allImageUrls;
    }
    if (tags.length > 0) updateData.tags = tags;

    if (req.body.weight !== undefined) updateData.weight = parseFloat(req.body.weight);
    if (req.body.color !== undefined) updateData.color = req.body.color;
    if (req.body.size !== undefined) updateData.size = req.body.size;
    if (req.body.material !== undefined) updateData.material = req.body.material;
    if (req.body.brand !== undefined) updateData.brand = req.body.brand;
    if (req.body.warranty !== undefined) updateData.warranty = req.body.warranty;
    if (req.body.isCodAvailable !== undefined) updateData.isCodAvailable = req.body.isCodAvailable === 'true' || req.body.isCodAvailable === true;
    if (req.body.isFreeShipping !== undefined) updateData.isFreeShipping = req.body.isFreeShipping === 'true' || req.body.isFreeShipping === true;
    if (req.body.showRatings !== undefined) updateData.showRatings = req.body.showRatings === 'true' || req.body.showRatings === true;
    if (req.body.isNewArrival !== undefined) updateData.isNewArrival = req.body.isNewArrival === 'true' || req.body.isNewArrival === true;

    if (productType === 'digital') {
      if (digitalFile) {
        updateData.file_path = `/uploads/products/${digitalFile.filename}`;
        updateData.file_size = digitalFile.size;
      }
      if (req.body.download_format !== undefined) updateData.download_format = req.body.download_format;
      if (req.body.license_type !== undefined) updateData.license_type = req.body.license_type;
      if (req.body.download_limit !== undefined) updateData.download_limit = parseInt(req.body.download_limit);
    }

    // SEO fields
    if (req.body.seo_title !== undefined || req.body.seo_description !== undefined || seoKeywords.length > 0 || req.body.seo_canonical !== undefined || req.body.seo_robots !== undefined || req.body.seo_og_title !== undefined || req.body.seo_og_description !== undefined || req.body.seo_og_image !== undefined) {
      updateData.seo = {};

      if (req.body.seo_title && req.body.seo_title.trim() !== '') {
        updateData.seo.title = req.body.seo_title;
      }
      if (req.body.seo_description && req.body.seo_description.trim() !== '') {
        updateData.seo.description = req.body.seo_description;
      }
      if (seoKeywords && seoKeywords.length > 0) {
        updateData.seo.keywords = seoKeywords;
      }
      if (req.body.seo_canonical && req.body.seo_canonical.trim() !== '') {
        updateData.seo.canonical = req.body.seo_canonical;
      }
      if (req.body.seo_robots) {
        updateData.seo.robots = req.body.seo_robots;
      }
      if (req.body.seo_og_title && req.body.seo_og_title.trim() !== '') {
        updateData.seo.ogTitle = req.body.seo_og_title;
      }
      if (req.body.seo_og_description && req.body.seo_og_description.trim() !== '') {
        updateData.seo.ogDescription = req.body.seo_og_description;
      }
      if (req.body.seo_og_image && req.body.seo_og_image.trim() !== '') {
        updateData.seo.ogImage = req.body.seo_og_image;
      }
    }

    // Transform and update variants
    if (variantsData && variantsData.combinations && variantsData.combinations.length > 0) {
      const transformedVariants = transformVariantsForDB(
        variantsData,
        req.body.sku || 'PROD',
        updateData.cost_price || currentProduct.cost_price,
        updateData.selling_price || currentProduct.selling_price,
        variantImagesMap
      );

      if (transformedVariants.length > 0) {
        // Preserve existing variant IDs if possible to maintain stock history
        const finalVariants = transformedVariants.map((variant, index) => {
          let existingVariantId = null;

          // Try to find matching variant by SKU or slug
          if (currentProduct.product_variants) {
            const match = currentProduct.product_variants.find(v =>
              (v.sku && v.sku === variant.sku) ||
              (v.slug && v.slug === variant.slug)
            );
            if (match) existingVariantId = match._id;
          }

          return {
            ...variant,
            _id: existingVariantId || new mongoose.Types.ObjectId(),
            status: variant.status || 'draft',
            published: variant.published !== undefined ? variant.published : true,
            stock: variant.stock || 0,
            minStock: variant.minStock || 0,
            images: Array.isArray(variant.images) ? variant.images.filter(Boolean) : [],
            attributes: variant.attributes || {},
            updated_at: new Date()
          };
        });

        updateData.product_variants = finalVariants;
      }
    }

    if (req.body.published !== undefined && productStructure !== 'variant') {
      const isPublishing = req.body.published === 'true';
      const currentPublished = currentProduct.published || false;

      if (isPublishing !== currentPublished) {
        // ✅ Create a merged product object with new variant data
        const productForValidation = {
          ...currentProduct.toObject(),
          ...updateData,
          product_variants: updateData.product_variants || currentProduct.product_variants,
          product_type: updateData.product_type || currentProduct.product_type,
          product_structure: updateData.product_structure || currentProduct.product_structure
        };

        console.log('=== VALIDATING WITH MERGED DATA ===');
        console.log('Product structure:', productForValidation.product_structure);
        console.log('Product type:', productForValidation.product_type);
        console.log('Variants count:', productForValidation.product_variants?.length || 0);
        if (productForValidation.product_variants && productForValidation.product_variants.length > 0) {
          console.log('First variant:', {
            name: productForValidation.product_variants[0].name,
            stock: productForValidation.product_variants[0].stock,
            minStock: productForValidation.product_variants[0].minStock,
            published: productForValidation.product_variants[0].published,
            status: productForValidation.product_variants[0].status
          });
        }

        const stockValidation = validateStockForPublish(productForValidation, isPublishing);

        if (!stockValidation.canPublish) {
          return res.status(400).json({
            success: false,
            error: stockValidation.message,
            requiresStock: true,
            stockInfo: stockValidation.stockInfo,
            isZeroStock: (stockValidation.stockInfo?.baseStock ?? currentProduct.baseStock ?? 0) === 0
          });
        }

        updateData.published = stockValidation.published;
        updateData.status = stockValidation.status;

        console.log('Stock validation result:', stockValidation);

        updateData._stockValidation = {
          message: stockValidation.message,
          stockInfo: stockValidation.stockInfo,
          requiredAction: isPublishing ? 'publish' : 'archive'
        };
      } else {
        updateData.published = req.body.published === 'true';
      }
    }

    console.log('=== BEFORE DATABASE UPDATE ===');
    console.log('productQuery:', JSON.stringify(productQuery, null, 2));
    console.log('updateData keys:', Object.keys(updateData));
    console.log('updateData:', JSON.stringify(updateData, null, 2));

    const product = await Product.findOneAndUpdate(
      productQuery,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    console.log('=== AFTER UPDATE ===');
    console.log('Updated product variants count:', product.product_variants ? product.product_variants.length : 0);

    // Update stock entries
    try {
      let staffMember;
      try {
        const Staff = require("../models/Staff.js");
        staffMember = await Staff.findOne({ is_active: true }).sort({ created_at: 1 });
      } catch (staffError) {
        console.error('Error finding staff member for stock update:', staffError);
      }

      // Only update base product stock for simple products, not variant products
      if (product.product_structure === 'simple' && (product.baseStock !== undefined || product.minStock !== undefined)) {
        const stockUpdate = {
          quantity: product.baseStock !== undefined ? product.baseStock : null,
          minStock: product.minStock !== undefined ? product.minStock : null,
          lastUpdatedBy: staffMember ? staffMember._id : null,
          updated_at: new Date()
        };

        await Stock.findOneAndUpdate(
          { productId: product._id, variantId: null },
          stockUpdate,
          { upsert: true, new: true }
        );
        console.log(`✅ Updated stock entry for base product ${product.name}`);
      }

      // For variant products, first clean up old stock entries then create new ones
      if (product.product_variants && product.product_variants.length > 0) {
        console.log('=== UPDATING VARIANT STOCK ENTRIES ===');

        // Get all current variant IDs from the updated product
        const currentVariantIds = product.product_variants.map(v => v._id.toString());
        console.log('Current variant IDs:', currentVariantIds);

        // Find all existing stock entries for this product's variants
        const existingStockEntries = await Stock.find({
          productId: product._id,
          variantId: { $ne: null }
        });
        console.log('Existing stock entries count:', existingStockEntries.length);

        // Delete stock entries for variants that no longer exist
        const stockEntriesToDelete = existingStockEntries.filter(
          stockEntry => !currentVariantIds.includes(stockEntry.variantId.toString())
        );

        if (stockEntriesToDelete.length > 0) {
          await Stock.deleteMany({
            _id: { $in: stockEntriesToDelete.map(s => s._id) }
          });
          console.log(`🗑️ Deleted ${stockEntriesToDelete.length} orphaned stock entries`);
        }

        // Update or create stock entries for each variant
        for (let i = 0; i < product.product_variants.length; i++) {
          const variant = product.product_variants[i];

          if (variant.stock !== undefined || variant.minStock !== undefined) {
            const stockUpdate = {
              productId: product._id,
              variantId: variant._id,
              quantity: variant.stock !== undefined ? variant.stock : 0,
              minStock: variant.minStock !== undefined ? variant.minStock : 0,
              lastUpdatedBy: staffMember ? staffMember._id : null,
              updated_at: new Date()
            };

            // Use variant slug or SKU as a secondary identifier to find existing entries
            const existingEntry = existingStockEntries.find(
              entry => entry.variantId.toString() === variant._id.toString()
            );

            if (existingEntry) {
              // Update existing entry
              await Stock.findByIdAndUpdate(existingEntry._id, stockUpdate);
              console.log(`✅ Updated existing stock entry for variant: ${variant.slug}`);
            } else {
              // Create new entry
              await Stock.create(stockUpdate);
              console.log(`✅ Created new stock entry for variant: ${variant.slug}`);
            }
          }
        }
      }
    } catch (stockError) {
      console.error('❌ Error updating stock entries:', stockError);
      console.error('Stock error details:', stockError.message);
    }

    res.json({ success: true, data: product });
  } catch (err) {
    console.error("Update product error:", err);
    console.error("Error stack:", err.stack);
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);

    if (err.message && err.message.includes('Duplicate variant SKUs')) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate variant SKUs detected within the product. Each variant must have a unique SKU.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }

    // Send more detailed error in development
    const errorResponse = {
      success: false,
      error: "Failed to update product"
    };

    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = err.message;
      errorResponse.stack = err.stack;
      errorResponse.name = err.name;
    }

    res.status(500).json(errorResponse);
  }
});

// DELETE a product by id
router.delete("/:id", async (req, res) => {
  try {
    console.log('=== DELETE PRODUCT DEBUG ===');
    console.log('Product ID to delete:', req.params.id);

    // Handle both string and ObjectId product IDs
    let productQuery = {};
    try {
      // Try to create ObjectId first
      if (req.params.id && req.params.id.length === 24 && /^[a-fA-F0-9]{24}$/.test(req.params.id)) {
        productQuery._id = new mongoose.Types.ObjectId(req.params.id);
      } else {
        // For non-ObjectId strings, search by the string value directly
        productQuery._id = req.params.id;
      }
    } catch (err) {
      // If ObjectId creation fails, treat as string ID
      productQuery._id = req.params.id;
    }

    // Find the product first to get its image URLs for cleanup
    const product = await Product.findOne(productQuery);

    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    console.log('Found product to delete:', product.name);
    console.log('Product image URLs:', product.image_url);

    // Extract main product image URLs for cleanup
    const mainImageFileNames = product.image_url
      ?.map((url) => url.split("/").pop()) // Extract just the filename
      .filter(Boolean) ?? [];

    console.log('Main product image files to delete:', mainImageFileNames);

    // Delete main product images
    if (mainImageFileNames.length > 0) {
      try {
        for (const imageFileName of mainImageFileNames) {
          const imagePath = path.join(uploadDir, imageFileName);
          console.log(`Attempting to delete main product image: ${imageFileName}`);
          console.log(`Full path: ${imagePath}`);
          console.log(`File exists: ${fs.existsSync(imagePath)}`);

          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log('✅ Deleted main product image:', imageFileName);
          } else {
            console.log(`⚠️ Main product image file not found: ${imageFileName}`);
          }
        }
      } catch (storageError) {
        console.error("❌ Error deleting main product images:", storageError);
        // Continue with product deletion even if image deletion fails
      }
    }

    // Extract variant image URLs for cleanup
    if (product.product_variants && product.product_variants.length > 0) {
      for (let i = 0; i < product.product_variants.length; i++) {
        const variant = product.product_variants[i];
        if (variant.images && variant.images.length > 0) {
          console.log(`Variant ${i} images to delete:`, variant.images);

          for (const imageUrl of variant.images) {
            if (imageUrl) {
              // Extract just the filename, not the full path
              const imageFileName = imageUrl.split("/").pop();
              const imagePath = path.join(uploadDir, imageFileName);

              console.log(`Attempting to delete variant image: ${imageFileName}`);
              console.log(`Full path: ${imagePath}`);
              console.log(`File exists: ${fs.existsSync(imagePath)}`);

              if (fs.existsSync(imagePath)) {
                try {
                  fs.unlinkSync(imagePath);
                  console.log('✅ Deleted variant image:', imageFileName);
                } catch (deleteError) {
                  console.error(`❌ Failed to delete variant image ${imageFileName}:`, deleteError.message);
                }
              } else {
                console.log(`⚠️ Variant image file not found: ${imageFileName}`);
              }
            } else {
              console.log(`⚠️ Empty image URL in variant ${i}`);
            }
          }
        } else {
          console.log(`⚠️ No images found for variant ${i}`);
        }
      }
    } else {
      console.log('⚠️ No product variants found');
    }

    // Delete digital product file if it exists
    if (product.product_type === 'digital' && product.file_path) {
      const digitalFileName = `products/${product.file_path.split("/").pop()}`;
      const digitalFilePath = path.join(uploadDir, digitalFileName);
      if (fs.existsSync(digitalFilePath)) {
        fs.unlinkSync(digitalFilePath);
        console.log('✅ Deleted digital product file:', digitalFileName);
      }
    }

    // Delete stock entries for this product
    try {
      const deletedStocks = await Stock.deleteMany({ productId: product._id });
      console.log(`✅ Deleted ${deletedStocks.deletedCount} stock entries for product ${product.name}`);
    } catch (stockError) {
      console.error('❌ Error deleting stock entries:', stockError);
      // Continue with product deletion even if stock deletion fails
    }

    // Delete the product from database
    const deletedProduct = await Product.findOneAndDelete(productQuery);

    if (!deletedProduct) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    console.log('✅ Successfully deleted product:', deletedProduct.name);

    res.json({
      success: true,
      message: "Product and all associated files deleted successfully",
      data: deletedProduct
    });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete product",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// BULK delete products
router.delete("/bulk", async (req, res) => {
  try {
    const { ids } = req.body; // array of IDs
    if (!ids || !Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, error: "No product IDs provided" });

    const objectIds = ids
      .map(id => {
        try {
          if (id && id.length === 24 && /^[a-fA-F0-9]{24}$/.test(id)) {
            return new mongoose.Types.ObjectId(id);
          }
          return id; // Keep as string if not ObjectId format
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (objectIds.length === 0)
      return res.status(400).json({ success: false, error: "No valid IDs provided" });

    // Fetch products to delete their associated files
    const productsToDelete = await Product.find({ _id: { $in: objectIds } });

    console.log(`Bulk deleting ${productsToDelete.length} products`);

    // Delete associated files for each product
    for (const product of productsToDelete) {
      // Delete main product images
      const mainImageFileNames = product.image_url
        ?.map((url) => url.split("/").pop()) // Extract just the filename
        .filter(Boolean) ?? [];

      for (const imageFileName of mainImageFileNames) {
        const imagePath = path.join(uploadDir, imageFileName);
        console.log(`Bulk delete - Attempting to delete main product image: ${imageFileName}`);
        console.log(`Bulk delete - Full path: ${imagePath}`);
        console.log(`Bulk delete - File exists: ${fs.existsSync(imagePath)}`);

        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log('✅ Bulk deleted main product image:', imageFileName);
        } else {
          console.log(`⚠️ Bulk main product image file not found: ${imageFileName}`);
        }
      }

      // Delete variant images
      if (product.product_variants && product.product_variants.length > 0) {
        for (let i = 0; i < product.product_variants.length; i++) {
          const variant = product.product_variants[i];
          if (variant.images && variant.images.length > 0) {
            console.log(`Bulk delete - Variant ${i} images to delete:`, variant.images);

            for (const imageUrl of variant.images) {
              if (imageUrl) {
                // Extract just the filename, not the full path
                const imageFileName = imageUrl.split("/").pop();
                const imagePath = path.join(uploadDir, imageFileName);

                console.log(`Bulk delete - Attempting to delete variant image: ${imageFileName}`);
                console.log(`Bulk delete - Full path: ${imagePath}`);
                console.log(`Bulk delete - File exists: ${fs.existsSync(imagePath)}`);

                if (fs.existsSync(imagePath)) {
                  try {
                    fs.unlinkSync(imagePath);
                    console.log('✅ Bulk deleted variant image:', imageFileName);
                  } catch (deleteError) {
                    console.error(`❌ Bulk failed to delete variant image ${imageFileName}:`, deleteError.message);
                  }
                } else {
                  console.log(`⚠️ Bulk variant image file not found: ${imageFileName}`);
                }
              } else {
                console.log(`⚠️ Bulk empty image URL in variant ${i}`);
              }
            }
          } else {
            console.log(`⚠️ Bulk no images found for variant ${i}`);
          }
        }
      } else {
        console.log('⚠️ Bulk no product variants found');
      }

      // Delete digital product file if it exists
      if (product.product_type === 'digital' && product.file_path) {
        const digitalFileName = `products/${product.file_path.split("/").pop()}`;
        const digitalFilePath = path.join(uploadDir, digitalFileName);
        if (fs.existsSync(digitalFilePath)) {
          fs.unlinkSync(digitalFilePath);
          console.log('✅ Deleted digital product file:', digitalFileName);
        }
      }
    }

    // Delete stock entries for all products
    try {
      const deletedStocks = await Stock.deleteMany({ productId: { $in: objectIds } });
      console.log(`✅ Bulk deleted ${deletedStocks.deletedCount} stock entries for ${productsToDelete.length} products`);
    } catch (stockError) {
      console.error('❌ Error deleting stock entries in bulk:', stockError);
      // Continue with product deletion even if stock deletion fails
    }

    // Delete products from database
    const result = await Product.deleteMany({ _id: { $in: objectIds } });

    res.json({
      success: true,
      message: `${result.deletedCount} products and all associated files deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error("Bulk delete products error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete products",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// PATCH toggle product published status
router.patch("/toggle-status", async (req, res) => {
  try {
    const { id, variantId, published } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Product ID is required"
      });
    }

    // First, get the current product to check its current state
    const currentProduct = await Product.findById(id);
    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        error: "Product not found"
      });
    }

    // If this is a variant product and we have a variantId
    if (currentProduct.product_structure === 'variant' && variantId) {
      // Find the variant in the product_variants array
      const variantIndex = currentProduct.product_variants.findIndex(
        v => v._id.toString() === variantId
      );

      if (variantIndex === -1) {
        return res.status(404).json({
          success: false,
          error: "Variant not found"
        });
      }

      // Update the variant's published status
      currentProduct.product_variants[variantIndex].published = published;

      // Update variant status based on stock and published status
      const variant = currentProduct.product_variants[variantIndex];
      if (published) {
        // When publishing, determine status based on stock
        if (variant.stock !== undefined && variant.minStock !== undefined) {
          variant.status = (variant.stock > variant.minStock)
            ? 'selling'
            : 'out_of_stock';
        } else {
          // If stock values are not set, set to draft
          variant.status = 'draft';
        }
      } else {
        // When unpublishing, set status to archived
        variant.status = 'archived';
      }

      // Check if any variants are published to determine product status
      const hasPublishedVariants = currentProduct.product_variants.some(v => v.published);
      const hasStock = currentProduct.product_variants.some(v => v.published && v.status === 'selling');

      // For variant products, only update the variants array
      // Don't update the main product's status or published fields
      const updateData = {
        'product_variants': currentProduct.product_variants,
        // Explicitly unset these fields for variant products
        $unset: {
          status: "",
          published: ""
        }
      };

      // Save the updated product
      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      return res.json({
        success: true,
        data: updatedProduct,
        message: published
          ? `Variant ${hasStock ? 'published' : 'published but out of stock'}`
          : 'Variant unpublished'
      });
    }

    // For non-variant products (simple products)
    const updateData = { published };

    if (published) {
      // When publishing, determine status based on stock
      const baseStock = typeof currentProduct.baseStock === 'number' ? currentProduct.baseStock : 0;
      const minStock = typeof currentProduct.minStock === 'number' ? currentProduct.minStock : 0;
      const hasStock = baseStock > 0 && baseStock > minStock;

      updateData.status = hasStock ? 'selling' : 'out_of_stock';
      updateData['seo.robots'] = hasStock ? 'index,follow' : 'noindex,follow';
    } else {
      // When unpublishing, set status to archived
      updateData.status = 'archived';
      updateData['seo.robots'] = 'noindex,nofollow';
    }

    // Update the product
    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      data: product,
      message: published
        ? `Product ${updateData.status === 'out_of_stock' ? 'published but out of stock' : 'published successfully'}`
        : 'Product archived'
    });
  } catch (err) {
    console.error("Toggle product status error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to toggle product status",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});


// PATCH archive/restore product
router.patch("/toggle-archive-status", async (req, res) => {
  try {
    const { id, variantId, archived } = req.body;
    console.log(`PATCH /toggle-archive-status called. ID: ${id}, VariantID: ${variantId}, Archived: ${archived}`);

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "Product ID is required"
      });
    }

    // First, get the current product
    const currentProduct = await Product.findById(id);
    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        error: "Product not found"
      });
    }

    // If this is a variant product and we have a variantId
    if (currentProduct.product_structure === 'variant' && variantId) {
      // Find the variant
      const variantIndex = currentProduct.product_variants.findIndex(
        v => v._id.toString() === variantId
      );

      if (variantIndex === -1) {
        return res.status(404).json({
          success: false,
          error: "Variant not found"
        });
      }

      // Update variant status
      if (archived) {
        currentProduct.product_variants[variantIndex].status = 'archived';
        currentProduct.product_variants[variantIndex].published = false;
      } else {
        // Restoring - set to draft by default for safety
        currentProduct.product_variants[variantIndex].status = 'draft';
        currentProduct.product_variants[variantIndex].published = false;
      }

      const updateData = {
        'product_variants': currentProduct.product_variants
      };

      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      return res.json({
        success: true,
        data: updatedProduct,
        message: archived ? 'Variant archived' : 'Variant restored to draft'
      });
    }

    // For simple products
    const updateData = {
      published: false // Always unpublish when archiving or restoring (safety)
    };

    if (archived) {
      updateData.status = 'archived';
      updateData['seo.robots'] = 'noindex,nofollow';
    } else {
      // Restoring - set to draft
      updateData.status = 'draft';
      // SEO remains noindex until published
    }

    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      data: product,
      message: archived ? 'Product archived' : 'Product restored to draft'
    });

  } catch (err) {
    console.error("Toggle archive status error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update archive status"
    });
  }
});

// PATCH bulk archive/restore
router.patch("/bulk-archive", async (req, res) => {
  try {
    const { ids, archived } = req.body; // ids: array of strings, archived: boolean

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No product IDs provided"
      });
    }

    // Convert string IDs to ObjectIds
    const objectIds = ids.map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    const updateData = {
      published: false
    };

    if (archived) {
      updateData.status = 'archived';
      updateData['seo.robots'] = 'noindex,nofollow';
    } else {
      // Restoring - set to draft
      updateData.status = 'draft';
      // SEO remains noindex until published
    }

    if (archived) {
      await Product.updateMany(
        { _id: { $in: objectIds }, product_structure: 'variant' },
        {
          $set: {
            "product_variants.$[].status": 'archived',
            "product_variants.$[].published": false
          }
        }
      );
    } else {
      await Product.updateMany(
        { _id: { $in: objectIds }, product_structure: 'variant' },
        {
          $set: {
            "product_variants.$[].status": 'draft',
            "product_variants.$[].published": false
          }
        }
      );
    }

    const result = await Product.updateMany(
      { _id: { $in: objectIds } },
      updateData
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} products ${archived ? 'archived' : 'restored'} successfully`,
      data: { modifiedCount: result.modifiedCount }
    });

  } catch (err) {
    console.error("Bulk archive error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to process bulk archive/restore"
    });
  }
});

// GET all ratings for a product
router.get("/:id/ratings", async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = 'newest' } = req.query;
    const productId = req.params.id;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build sort query
    let sortQuery = {};
    if (sort === 'newest') {
      sortQuery = { created_at: -1 };
    } else if (sort === 'oldest') {
      sortQuery = { created_at: 1 };
    } else if (sort === 'highest') {
      sortQuery = { rating: -1 };
    } else if (sort === 'lowest') {
      sortQuery = { rating: 1 };
    }

    const Rating = require("../models/Rating");
    const Customer = require("../models/Customer");

    const ratings = await Rating.find({
      product_id: new mongoose.Types.ObjectId(productId),
      status: 'approved'
    })
      .populate({
        path: 'customer_id',
        model: Customer,
        select: 'name email'
      })
      .sort(sortQuery)
      .skip(skip)
      .limit(limitNum);

    const total = await Rating.countDocuments({
      product_id: new mongoose.Types.ObjectId(productId),
      status: 'approved'
    });

    // Calculate rating statistics
    const ratingStats = await Rating.aggregate([
      { $match: { product_id: new mongoose.Types.ObjectId(productId), status: 'approved' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating'
          }
        }
      }
    ]);

    const stats = ratingStats[0] || {
      averageRating: 0,
      totalRatings: 0,
      ratingDistribution: []
    };

    // Calculate distribution (1-5 stars)
    const distribution = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: stats.ratingDistribution.filter(r => r === rating).length
    }));

    res.json({
      success: true,
      data: ratings,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1
      },
      stats: {
        averageRating: Math.round(stats.averageRating * 10) / 10,
        totalRatings: stats.totalRatings,
        distribution
      }
    });
  } catch (err) {
    console.error("Error fetching ratings:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch ratings"
    });
  }
});

// POST a new rating/review
router.post("/:id/ratings", async (req, res) => {
  try {
    const { customer_id, rating, review } = req.body;
    const productId = req.params.id;

    // Validate required fields
    if (!customer_id || !rating) {
      return res.status(400).json({
        success: false,
        error: "Customer ID and rating are required"
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: "Rating must be between 1 and 5"
      });
    }

    // Find customer by firebase_uid to get ObjectId
    const Customer = require("../models/Customer");
    const customer = await Customer.findOne({ firebase_uid: customer_id });

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: "Customer not found"
      });
    }

    const customerObjectId = customer._id;

    const Rating = require("../models/Rating");

    // Check if user has already rated this product
    const existingRating = await Rating.findOne({
      customer_id: customerObjectId,
      product_id: new mongoose.Types.ObjectId(productId)
    });
    if (existingRating) {
      return res.status(400).json({
        success: false,
        error: "You have already rated this product"
      });
    }

    // Check if customer has purchased this product (for verified purchase)
    const Order = require("../models/Order");

    const hasPurchased = await Order.findOne({
      customer_id: customerObjectId,
      status: { $in: ['processing', 'shipped', 'delivered'] }, // Include processing orders
      'items.product_id': new mongoose.Types.ObjectId(productId)
    });

    // Block rating if user hasn't purchased the product
    if (!hasPurchased) {
      return res.status(403).json({
        success: false,
        error: "You can only rate products you have purchased"
      });
    }

    // Create new rating
    const newRating = new Rating({
      customer_id: customerObjectId,
      product_id: new mongoose.Types.ObjectId(productId),
      rating: parseInt(rating),
      review: review || '',
      verified_purchase: !!hasPurchased, // Convert to boolean
      status: 'approved' // Auto-approve for now, can be changed to pending for moderation
    });

    await newRating.save();

    // Update product's average rating and counts
    const Product = require("../models/Product");
    const ratingStats = await Rating.aggregate([
      { $match: { product_id: new mongoose.Types.ObjectId(productId), status: 'approved' } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          totalReviews: {
            $sum: {
              $cond: [{ $ne: ['$review', null] }, 1, 0]
            }
          }
        }
      }
    ]);

    const stats = ratingStats[0] || { averageRating: 0, totalRatings: 0, totalReviews: 0 };

    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(stats.averageRating * 10) / 10,
      totalRatings: stats.totalRatings,
      totalReviews: stats.totalReviews
    });

    res.status(201).json({
      success: true,
      message: "Rating submitted successfully",
      data: newRating
    });
  } catch (err) {
    console.error("Error submitting rating:", err);
    res.status(500).json({
      success: false,
      error: "Failed to submit rating"
    });
  }
});

// GET customer rating for a product
router.get("/:id/customer-rating", async (req, res) => {
  try {
    const { customer_id } = req.query;
    const productId = req.params.id;

    if (!customer_id) {
      return res.json({
        success: true,
        data: null
      });
    }

    const Customer = require("../models/Customer");
    const customer = await Customer.findOne({ firebase_uid: customer_id });

    if (!customer) {
      return res.json({
        success: true,
        data: null
      });
    }

    const Rating = require("../models/Rating");
    const rating = await Rating.findOne({
      customer_id: customer._id,
      product_id: new mongoose.Types.ObjectId(productId)
    });

    res.json({
      success: true,
      data: rating
    });
  } catch (err) {
    console.error("Error fetching customer rating:", err);
    res.status(500).json({
      success: false,
      error: "Failed to fetch rating"
    });
  }
});

// GET /api/products/export/csv - Export products as CSV
router.get("/export/csv", async (req, res) => {
  try {
    const { sendCSVResponse, formatCurrency, formatDate } = require('../utils/csvExport');

    // Fetch all products with populated data
    const products = await Product.find({})
      .populate('categories.category', 'name')
      .populate('categories.subcategories', 'name')
      .lean();

    // Flatten products for CSV export
    const csvData = products.map(product => {
      const categories = product.categories?.map(c => c.category?.name).filter(Boolean).join('; ') || '';
      const subcategories = product.categories?.flatMap(c =>
        c.subcategories?.map(s => s.name).filter(Boolean) || []
      ).join('; ') || '';

      return {
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: product.description || '',
        product_type: product.product_type,
        product_structure: product.product_structure,
        categories: categories,
        subcategories: subcategories,
        cost_price: product.cost_price || '',
        selling_price: product.selling_price || '',
        baseStock: product.baseStock || '',
        minStock: product.minStock || '',
        status: product.status || '',
        published: product.published ? 'Yes' : 'No',
        averageRating: product.averageRating || 0,
        totalRatings: product.totalRatings || 0,
        weight: product.weight || '',
        color: product.color || '',
        warranty: product.warranty || '',
        isCodAvailable: product.isCodAvailable ? 'Yes' : 'No',
        isFreeShipping: product.isFreeShipping ? 'Yes' : 'No',
        tags: product.tags?.join('; ') || '',
        created_at: formatDate(product.created_at),
        updated_at: formatDate(product.updated_at)
      };
    });

    const fields = [
      { key: 'name', label: 'Product Name' },
      { key: 'slug', label: 'Slug' },
      { key: 'sku', label: 'SKU' },
      { key: 'description', label: 'Description' },
      { key: 'product_type', label: 'Product Type' },
      { key: 'product_structure', label: 'Product Structure' },
      { key: 'categories', label: 'Categories' },
      { key: 'subcategories', label: 'Subcategories' },
      { key: 'cost_price', label: 'Cost Price' },
      { key: 'selling_price', label: 'Selling Price' },
      { key: 'baseStock', label: 'Stock' },
      { key: 'minStock', label: 'Min Stock' },
      { key: 'status', label: 'Status' },
      { key: 'published', label: 'Published' },
      { key: 'averageRating', label: 'Average Rating' },
      { key: 'totalRatings', label: 'Total Ratings' },
      { key: 'weight', label: 'Weight' },
      { key: 'color', label: 'Color' },
      { key: 'warranty', label: 'Warranty' },
      { key: 'isCodAvailable', label: 'COD Available' },
      { key: 'isFreeShipping', label: 'Free Shipping' },
      { key: 'tags', label: 'Tags' },
      { key: 'created_at', label: 'Created At' },
      { key: 'updated_at', label: 'Updated At' }
    ];

    sendCSVResponse(res, csvData, fields, `products_${new Date().toISOString().split('T')[0]}`);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ success: false, error: 'Failed to export products as CSV' });
  }
});

// POST /api/products/import/csv - Import products from CSV
router.post("/import/csv", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const fs = require('fs');
    const csv = require('csv-parser');
    const results = [];
    const errors = [];

    // Read and parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        let imported = 0;
        let skipped = 0;

        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          try {
            // Validate required fields
            if (!row['Product Name'] || !row['SKU']) {
              errors.push({ row: i + 2, error: 'Missing required fields: Product Name or SKU' });
              skipped++;
              continue;
            }

            // Check if product with same SKU exists
            const existingProduct = await Product.findOne({ sku: row['SKU'] });
            if (existingProduct) {
              errors.push({ row: i + 2, error: `Product with SKU ${row['SKU']} already exists` });
              skipped++;
              continue;
            }

            // Prepare product data
            const productData = {
              name: row['Product Name'],
              slug: row['Slug'] || row['Product Name'].toLowerCase().replace(/\s+/g, '-'),
              sku: row['SKU'],
              description: row['Description'] || '',
              product_type: row['Product Type'] || 'physical',
              product_structure: row['Product Structure'] || 'simple',
              cost_price: parseFloat(row['Cost Price']) || 0,
              selling_price: parseFloat(row['Selling Price']) || 0,
              baseStock: parseInt(row['Stock']) || 0,
              minStock: parseInt(row['Min Stock']) || 0,
              status: row['Status'] || 'draft',
              published: row['Published']?.toLowerCase() === 'yes',
              weight: parseFloat(row['Weight']) || undefined,
              color: row['Color'] || undefined,
              warranty: row['Warranty'] || undefined,
              isCodAvailable: row['COD Available']?.toLowerCase() !== 'no',
              isFreeShipping: row['Free Shipping']?.toLowerCase() === 'yes',
              tags: row['Tags'] ? row['Tags'].split(';').map(t => t.trim()) : []
            };

            // Create product
            const product = await Product.create(productData);
            imported++;

          } catch (error) {
            errors.push({ row: i + 2, error: error.message });
            skipped++;
          }
        }

        // Delete uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
          success: true,
          message: `Import completed. ${imported} products imported, ${skipped} skipped.`,
          imported,
          skipped,
          errors: errors.length > 0 ? errors : undefined
        });
      })
      .on('error', (error) => {
        console.error('CSV parsing error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, error: 'Failed to parse CSV file' });
      });

  } catch (error) {
    console.error('CSV import error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: 'Failed to import products from CSV' });
  }
});

module.exports = router;
