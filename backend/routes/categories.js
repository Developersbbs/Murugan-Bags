const Subcategory = require("../models/Subcategory.js");
const Category = require("../models/Category.js");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { ObjectId } = require("mongodb");
const router = require("express").Router();
// --------------------------
// Ensure uploads folder exists
// --------------------------
const uploadDir = path.join(__dirname, "../uploads/categories");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Created categories upload directory: ${uploadDir}`);
}

// --------------------------
// Multer storage config
// --------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// --------------------------
// STATIC FILE SERVING
// --------------------------
router.get("/uploads/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadDir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: "Image not found" });

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

// --------------------------
// GET multiple categories by IDs (robust)
// --------------------------
router.get("/bulk", async (req, res) => {
  try {
    const { ids } = req.query; // CSV: "id1,id2,id3"
    if (!ids) return res.status(400).json({ success: false, error: "No IDs provided" });

    const idArray = ids
      .split(",")
      .map(id => {
        try {
          return new ObjectId(id); // convert valid IDs only
        } catch {
          return null; // ignore invalid IDs
        }
      })
      .filter(Boolean);

    if (idArray.length === 0)
      return res.status(400).json({ success: false, error: "No valid IDs provided" });

    const categories = await Category.find({ _id: { $in: idArray } }).populate('subcategories');

    const categoriesWithFullImageUrls = categories.map(cat => ({
      ...cat.toObject(),
      image_url: cat.image_url ? `${req.protocol}://${req.get("host")}${cat.image_url}` : null,
    }));

    res.json({ success: true, data: categoriesWithFullImageUrls });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------
// BULK update published
// --------------------------
router.put("/bulk", async (req, res) => {
  try {
    const { ids, published } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, error: "No category IDs provided" });

    const objectIds = ids
      .map(id => {
        try { return new ObjectId(id); }
        catch { return null; }
      })
      .filter(Boolean);

    if (objectIds.length === 0)
      return res.status(400).json({ success: false, error: "No valid IDs provided" });

    const result = await Category.updateMany(
      { _id: { $in: objectIds } },
      { $set: { published, updated_at: new Date() } }
    );

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------
// DELETE multiple categories by IDs
// --------------------------
router.delete("/bulk", async (req, res) => {
  try {
    const { ids } = req.body; // array of IDs
    if (!ids || !Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, error: "No category IDs provided" });

    const objectIds = ids
      .map(id => {
        try { return new ObjectId(id); }
        catch { return null; }
      })
      .filter(Boolean);

    if (objectIds.length === 0)
      return res.status(400).json({ success: false, error: "No valid IDs provided" });

    // Delete associated subcategories first
    await Subcategory.deleteMany({ category_id: { $in: objectIds } });

    // Fetch categories to delete their images
    const categoriesToDelete = await Category.find({ _id: { $in: objectIds } });

    for (const cat of categoriesToDelete) {
      if (cat.image_url) {
        const imagePath = path.join(uploadDir, path.basename(cat.image_url));
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      }
    }

    // Delete categories
    const result = await Category.deleteMany({ _id: { $in: objectIds } });

    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------
// Other CRUD routes
// --------------------------

// GET all categories (search/pagination)
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Enhanced search across multiple fields including subcategories
    let filter = {};
    if (search) {
      const searchRegex = new RegExp(search, 'i');

      // First, find subcategories that match the search
      const matchingSubcategories = await Subcategory.find({
        $or: [
          { name: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { slug: { $regex: searchRegex } }
        ]
      }).select('category_id');

      // Get unique category IDs from matching subcategories
      const categoryIdsFromSubcategories = [...new Set(matchingSubcategories.map(sub => sub.category_id.toString()))];

      // Build filter to search in categories OR in their subcategories
      filter = {
        $or: [
          { name: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { slug: { $regex: searchRegex } },
          { seo_title: { $regex: searchRegex } },
          { seo_description: { $regex: searchRegex } },
          // Include categories that have matching subcategories
          ...(categoryIdsFromSubcategories.length > 0
            ? [{ _id: { $in: categoryIdsFromSubcategories.map(id => new ObjectId(id)) } }]
            : []
          )
        ]
      };
    }

    const categories = await Category.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('subcategories');

    const total = await Category.countDocuments(filter);
    // Return image_url as-is since it's already a full URL from Firebase
    const categoriesWithFullImageUrls = categories.map(cat => ({
      ...cat.toObject(),
      image_url: cat.image_url || null,
    }));

    res.json({
      success: true,
      data: categoriesWithFullImageUrls,
      meta: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE category
router.post("/", async (req, res) => {
  try {
    const { name, description, slug, image } = req.body;

    // Parse subcategories from form data
    const subcategories = [];
    let subcategoryIndex = 0;

    // First, try to parse subcategories as JSON string (fallback)
    if (req.body.subcategories && typeof req.body.subcategories === 'string') {
      try {
        const parsedSubcategories = JSON.parse(req.body.subcategories);
        console.log('POST Parsed subcategories from JSON:', parsedSubcategories);
        parsedSubcategories.forEach(subcat => {
          if (subcat.name && subcat.slug) {
            subcategories.push(subcat);
          }
        });
      } catch (err) {
        console.log('POST Failed to parse subcategories JSON:', err.message);
      }
    }

    // If no subcategories from JSON, try the individual fields approach
    if (subcategories.length === 0) {
      console.log('POST Trying individual fields approach...');
      console.log('POST Request body keys:', Object.keys(req.body));
      console.log('POST Sample subcategory data:', req.body['subcategories.0.name'], req.body['subcategories.0.slug']);

      // Check for subcategories in the request body
      const subcatKeys = Object.keys(req.body).filter(key => key.startsWith('subcategories.'));
      console.log('POST Subcategory keys found:', subcatKeys);

      if (subcatKeys.length > 0) {
        // Group by index
        const groupedSubcats = {};
        subcatKeys.forEach(key => {
          const match = key.match(/subcategories\.(\d+)\.(\w+)/);
          if (match) {
            const index = match[1];
            const field = match[2];
            if (!groupedSubcats[index]) {
              groupedSubcats[index] = {};
            }
            groupedSubcats[index][field] = req.body[key];
          }
        });

        console.log('POST Grouped subcategories:', groupedSubcats);

        Object.values(groupedSubcats).forEach((subcat) => {
          if (subcat.name && subcat.slug) {
            subcategories.push({
              name: subcat.name,
              description: subcat.description || "",
              slug: subcat.slug,
            });
          }
        });
      }
    }

    console.log('POST Final parsed subcategories:', subcategories);

    const category = new Category({
      name,
      description,
      slug,
      published: true,
      image_url: image || null,
    });
    await category.save();

    // Create subcategories if provided
    if (subcategories.length > 0) {
      const subcategoriesToCreate = subcategories.map(subcat => ({
        ...subcat,
        category_id: category._id,
        published: true,
      }));

      const createdSubcategories = await Subcategory.insertMany(subcategoriesToCreate);

      // Update category with subcategory IDs using update query
      await Category.findByIdAndUpdate(category._id, {
        subcategories: createdSubcategories.map(sub => sub._id)
      });
    }

    res.status(201).json({
      success: true,
      data: {
        ...category.toObject(),
        image_url: category.image_url || null, // Use the full URL as is from Firebase
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE category
router.put("/:id", async (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const logFile = path.join(__dirname, '../debug_categories.log');

  const log = (msg) => {
    try {
      fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
    } catch (e) { console.error(e); }
  };

  try {
    log(`PUT Request for Category ID: ${req.params.id}`);

    // Ensure req.body exists and is an object
    if (!req.body || typeof req.body !== 'object') {
      log('Invalid request body');
      return res.status(400).json({
        success: false,
        error: "Invalid request body"
      });
    }

    log(`Request Body Keys: ${JSON.stringify(Object.keys(req.body))}`);
    // Log typical fields to check content (truncated)
    log(`Name: ${req.body.name}, Slug: ${req.body.slug}`);

    const { name, description, slug, published, image } = req.body || {};
    const updateData = {
      updated_at: new Date(),
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(slug && { slug }),
      ...(published !== undefined && { published: published === 'true' }), // Convert string to boolean
      ...(image !== undefined && { image_url: image }) // Set image_url from the image field
    };

    log(`Update Data: ${JSON.stringify(updateData)}`);

    // Update the category
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!category) {
      log('Category not found');
      return res.status(404).json({ success: false, error: "Category not found" });
    }

    // Parse and handle subcategories from form data
    const subcategoriesArray = [];

    // Check for subcategories in the request body
    const subcatKeys = Object.keys(req.body).filter(key => key.startsWith('subcategories.'));
    log(`Subcategory keys found: ${subcatKeys.length}`);

    if (subcatKeys.length > 0) {
      // Group by index
      const groupedSubcats = {};
      subcatKeys.forEach(key => {
        const match = key.match(/subcategories\.(\d+)\.(\w+)/);
        if (match) {
          const index = match[1];
          const field = match[2];
          if (!groupedSubcats[index]) {
            groupedSubcats[index] = {};
          }
          groupedSubcats[index][field] = req.body[key];
        }
      });

      log(`Grouped subcategories: ${JSON.stringify(groupedSubcats)}`);

      Object.values(groupedSubcats).forEach((subcat) => {
        if (subcat.name && subcat.slug) {
          subcategoriesArray.push({
            name: subcat.name,
            description: subcat.description || "",
            slug: subcat.slug,
          });
        }
      });
    }

    log(`Final parsed subcategories count: ${subcategoriesArray.length}`);

    if (subcatKeys.length > 0 || req.body.subcategories !== undefined) {
      // Remove existing subcategories first
      await Subcategory.deleteMany({ category_id: req.params.id });

      if (subcategoriesArray.length > 0) {
        // Create new subcategories
        const subcategoriesToCreate = subcategoriesArray.map(subcat => ({
          ...subcat,
          category_id: category._id,
          published: true,
        }));

        const createdSubcategories = await Subcategory.insertMany(subcategoriesToCreate);
        log(`Created ${createdSubcategories.length} new subcategories`);

        // Update category with new subcategory IDs using a separate update
        await Category.findByIdAndUpdate(req.params.id, {
          $set: { subcategories: createdSubcategories.map(sub => sub._id) }
        });
      } else {
        // Clear subcategories array if explicitly set to empty
        await Category.findByIdAndUpdate(req.params.id, {
          $set: { subcategories: [] }
        });
        log('Cleared subcategories');
      }
    }

    // Fetch the updated category to return
    const updatedCategory = await Category.findById(req.params.id);

    res.json({
      success: true,
      data: {
        ...updatedCategory.toObject(),
        image_url: updatedCategory.image_url ? `${req.protocol}://${req.get("host")}${updatedCategory.image_url}` : null,
      },
    });
  } catch (err) {
    console.error('PUT category error:', err);
    log(`ERROR: ${err.message}\n${err.stack}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET categories for dropdown
router.get("/dropdown", async (req, res) => {
  try {
    const { all } = req.query;
    const filter = all === 'true' ? {} : { published: true };

    const categories = await Category.find(filter)
      .select("name slug")
      .sort({ name: 1 });

    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET category by ID
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate('subcategories');
    if (!category) return res.status(404).json({ success: false, error: "Category not found" });

    // Also get the full subcategory details for display
    const subcategories = await Subcategory.find({ category_id: req.params.id })
      .sort({ name: 1 });

    res.json({
      success: true,
      data: {
        ...category.toObject(),
        image_url: category.image_url ? `${req.protocol}://${req.get("host")}${category.image_url}` : null,
        subcategories: subcategories.map(subcat => ({
          ...subcat.toObject(),
          image_url: subcat.image_url ? `${req.protocol}://${req.get("host")}${subcat.image_url}` : null,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE single category
router.delete("/:id", async (req, res) => {
  try {
    // Delete associated subcategories first
    await Subcategory.deleteMany({ category_id: req.params.id });

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, error: "Category not found" });

    if (category.image_url) {
      const imagePath = path.join(uploadDir, path.basename(category.image_url));
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    res.json({ success: true, message: "Category and all its subcategories deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Export categories to CSV
router.get("/export/csv", async (req, res) => {
  try {
    const { search, published, sort_order } = req.query;

    // Build filter with enhanced search including subcategories
    let filter = {};
    if (search) {
      const searchRegex = new RegExp(search, 'i');

      // Find subcategories that match the search
      const matchingSubcategories = await Subcategory.find({
        $or: [
          { name: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { slug: { $regex: searchRegex } }
        ]
      }).select('category_id');

      const categoryIdsFromSubcategories = [...new Set(matchingSubcategories.map(sub => sub.category_id.toString()))];

      filter.$or = [
        { name: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { slug: { $regex: searchRegex } },
        { seo_title: { $regex: searchRegex } },
        { seo_description: { $regex: searchRegex } },
        ...(categoryIdsFromSubcategories.length > 0
          ? [{ _id: { $in: categoryIdsFromSubcategories.map(id => new ObjectId(id)) } }]
          : []
        )
      ];
    }
    if (published !== undefined) {
      filter.published = published === 'true';
    }

    const categories = await Category.find(filter)
      .populate('subcategories')
      .sort({ created_at: -1 });

    if (categories.length === 0) {
      return res.status(404).json({ success: false, error: "No categories found to export" });
    }

    // Convert to CSV format
    const csvHeaders = [
      'ID',
      'Name',
      'Description',
      'Slug',
      'Image URL',
      'Subcategories Count',
      'Subcategories',
      'Created At',
      'Updated At'
    ];

    const csvRows = categories.map(cat => [
      cat._id,
      cat.name,
      cat.description || '',
      cat.slug,
      cat.image_url || '',
      cat.subcategories ? cat.subcategories.length : 0,
      cat.subcategories ? cat.subcategories.map(sub => sub.name).join('; ') : '',
      cat.createdAt || cat.created_at,
      cat.updatedAt || cat.updated_at
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="categories_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export categories to JSON
router.get("/export/json", async (req, res) => {
  try {
    const { search, published, sort_order } = req.query;

    // Build filter with enhanced search including subcategories
    let filter = {};
    if (search) {
      const searchRegex = new RegExp(search, 'i');

      // Find subcategories that match the search
      const matchingSubcategories = await Subcategory.find({
        $or: [
          { name: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { slug: { $regex: searchRegex } }
        ]
      }).select('category_id');

      const categoryIdsFromSubcategories = [...new Set(matchingSubcategories.map(sub => sub.category_id.toString()))];

      filter.$or = [
        { name: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { slug: { $regex: searchRegex } },
        { seo_title: { $regex: searchRegex } },
        { seo_description: { $regex: searchRegex } },
        ...(categoryIdsFromSubcategories.length > 0
          ? [{ _id: { $in: categoryIdsFromSubcategories.map(id => new ObjectId(id)) } }]
          : []
        )
      ];
    }
    if (published !== undefined) {
      filter.published = published === 'true';
    }

    const categories = await Category.find(filter)
      .populate('subcategories')
      .sort({ created_at: -1 });

    if (categories.length === 0) {
      return res.status(404).json({ success: false, error: "No categories found to export" });
    }

    const exportData = categories.map(cat => ({
      id: cat._id,
      name: cat.name,
      description: cat.description,
      slug: cat.slug,
      published: cat.published,
      imageUrl: cat.image_url,
      subcategoriesCount: cat.subcategories ? cat.subcategories.length : 0,
      subcategories: cat.subcategories ? cat.subcategories.map(sub => ({
        id: sub._id,
        name: sub.name,
        description: sub.description,
        slug: sub.slug
      })) : [],
      createdAt: cat.createdAt || cat.created_at,
      updatedAt: cat.updatedAt || cat.updated_at
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="categories_${new Date().toISOString().split('T')[0]}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      totalRecords: exportData.length,
      filters: {
        search: search || null,
        published: published || null,
        sort_order: sort_order || null
      },
      data: exportData
    });
  } catch (err) {
    console.error('JSON export error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/categories/import/csv - Import categories from CSV
router.post("/import/csv", upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

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
            if (!row['Name'] || !row['Slug']) {
              errors.push({ row: i + 2, error: 'Missing required fields: Name or Slug' });
              skipped++;
              continue;
            }

            // Check if category with same slug exists
            const existingCategory = await Category.findOne({ slug: row['Slug'] });
            if (existingCategory) {
              errors.push({ row: i + 2, error: `Category with slug ${row['Slug']} already exists` });
              skipped++;
              continue;
            }

            // Prepare category data
            const categoryData = {
              name: row['Name'],
              slug: row['Slug'],
              description: row['Description'] || '',
              image_url: row['Image URL'] || null,
              published: true
            };

            // Create category
            const category = await Category.create(categoryData);

            // Handle subcategories if provided
            if (row['Subcategories']) {
              const subcategoryNames = row['Subcategories'].split(';').map(s => s.trim()).filter(Boolean);

              if (subcategoryNames.length > 0) {
                const subcategoriesToCreate = subcategoryNames.map(name => ({
                  name: name,
                  slug: name.toLowerCase().replace(/\s+/g, '-'),
                  category_id: category._id,
                  published: true
                }));

                const createdSubcategories = await Subcategory.insertMany(subcategoriesToCreate);

                // Update category with subcategory IDs
                await Category.findByIdAndUpdate(category._id, {
                  subcategories: createdSubcategories.map(sub => sub._id)
                });
              }
            }

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
          message: `Import completed. ${imported} categories imported, ${skipped} skipped.`,
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
    res.status(500).json({ success: false, error: 'Failed to import categories from CSV' });
  }
});

module.exports = router;
