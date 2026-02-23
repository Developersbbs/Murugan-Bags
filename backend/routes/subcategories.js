const express = require("express");
const Subcategory = require("../models/Subcategory.js");
const Category = require("../models/Category.js");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const { ObjectId } = require("mongodb");

// Use Firebase upload middleware
const { upload } = require('../middleware/upload');

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
// GET subcategories by category ID
// --------------------------
router.get("/category/:categoryId", async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10, search, published } = req.query;

    // Validate category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, error: "Category not found" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { category_id: categoryId };

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (published !== undefined) {
      filter.published = published === 'true';
    }

    const subcategories = await Subcategory.find(filter)
      .populate('category_id', 'name slug')
      .sort({ sort_order: 1, created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Subcategory.countDocuments(filter);

    const subcategoriesWithFullImageUrls = subcategories.map(subcat => ({
      ...subcat.toObject(),
      image_url: subcat.image_url ? `${req.protocol}://${req.get("host")}${subcat.image_url}` : null,
    }));

    res.json({
      success: true,
      data: subcategoriesWithFullImageUrls,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        category: category.name
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------
// GET all subcategories (search/pagination)
// --------------------------
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category_id, published } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (category_id) {
      filter.category_id = category_id;
    }

    if (published !== undefined) {
      filter.published = published === 'true';
    }

    const subcategories = await Subcategory.find(filter)
      .populate('category_id', 'name slug')
      .sort({ sort_order: 1, created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Subcategory.countDocuments(filter);

    const subcategoriesWithFullImageUrls = subcategories.map(subcat => ({
      ...subcat.toObject(),
      image_url: subcat.image_url ? `${req.protocol}://${req.get("host")}${subcat.image_url}` : null,
    }));

    res.json({
      success: true,
      data: subcategoriesWithFullImageUrls,
      meta: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------
// CREATE subcategory
// --------------------------
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, description, slug, category_id, published = true, sort_order = 0 } = req.body;

    // Validate category exists
    const category = await Category.findById(category_id);
    if (!category) {
      return res.status(404).json({ success: false, error: "Category not found" });
    }

    // Check if slug already exists within the same category
    const existingSubcategory = await Subcategory.findOne({ category_id, slug });
    if (existingSubcategory) {
      return res.status(400).json({ success: false, error: "Subcategory slug already exists in this category" });
    }

    const subcategory = new Subcategory({
      name,
      description,
      slug,
      category_id,
      published,
      sort_order,
      image_url: req.file ? (req.file.firebaseUrl || `/uploads/subcategories/${req.file.filename}`) : null,
    });

    await subcategory.save();

    // Populate category info for response
    await subcategory.populate('category_id', 'name slug');

    res.status(201).json({
      success: true,
      data: {
        ...subcategory.toObject(),
        image_url: subcategory.image_url ? `${req.protocol}://${req.get("host")}${subcategory.image_url}` : null,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ success: false, error: "Subcategory slug already exists in this category" });
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// --------------------------
// GET subcategory by ID
// --------------------------
router.get("/:id", async (req, res) => {
  try {
    const subcategory = await Subcategory.findById(req.params.id).populate('category_id', 'name slug');
    if (!subcategory) return res.status(404).json({ success: false, error: "Subcategory not found" });

    res.json({
      success: true,
      data: {
        ...subcategory.toObject(),
        image_url: subcategory.image_url ? `${req.protocol}://${req.get("host")}${subcategory.image_url}` : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------
// UPDATE subcategory
// --------------------------
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, description, slug, category_id, published, sort_order } = req.body;

    // If category_id is being changed, validate new category exists
    if (category_id) {
      const category = await Category.findById(category_id);
      if (!category) {
        return res.status(404).json({ success: false, error: "Category not found" });
      }
    }

    const updateData = { ...req.body, updated_at: new Date() };
    if (req.file) updateData.image_url = req.file.firebaseUrl || `/uploads/subcategories/${req.file.filename}`;

    // If slug or category is being updated, check for duplicates
    if (slug || category_id) {
      const currentSubcategory = await Subcategory.findById(req.params.id);
      if (!currentSubcategory) {
        return res.status(404).json({ success: false, error: "Subcategory not found" });
      }

      const checkCategoryId = category_id || currentSubcategory.category_id;
      const checkSlug = slug || currentSubcategory.slug;

      const existingSubcategory = await Subcategory.findOne({
        category_id: checkCategoryId,
        slug: checkSlug,
        _id: { $ne: req.params.id }
      });

      if (existingSubcategory) {
        return res.status(400).json({ success: false, error: "Subcategory slug already exists in this category" });
      }
    }

    const subcategory = await Subcategory.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('category_id', 'name slug');

    if (!subcategory) return res.status(404).json({ success: false, error: "Subcategory not found" });

    res.json({
      success: true,
      data: {
        ...subcategory.toObject(),
        image_url: subcategory.image_url ? `${req.protocol}://${req.get("host")}${subcategory.image_url}` : null,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ success: false, error: "Subcategory slug already exists in this category" });
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

// --------------------------
// DELETE subcategory
// --------------------------
router.delete("/:id", async (req, res) => {
  try {
    const subcategory = await Subcategory.findByIdAndDelete(req.params.id);
    if (!subcategory) return res.status(404).json({ success: false, error: "Subcategory not found" });

    // Delete associated image file
    if (subcategory.image_url) {
      const imagePath = path.join(uploadDir, path.basename(subcategory.image_url));
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    res.json({ success: true, message: "Subcategory deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------
// BULK operations
// --------------------------

// GET multiple subcategories by IDs
router.get("/bulk", async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ success: false, error: "No IDs provided" });

    const idArray = ids
      .split(",")
      .map(id => {
        try {
          return new ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (idArray.length === 0)
      return res.status(400).json({ success: false, error: "No valid IDs provided" });

    const subcategories = await Subcategory.find({ _id: { $in: idArray } })
      .populate('category_id', 'name slug');

    const subcategoriesWithFullImageUrls = subcategories.map(subcat => ({
      ...subcat.toObject(),
      image_url: subcat.image_url ? `${req.protocol}://${req.get("host")}${subcat.image_url}` : null,
    }));

    res.json({ success: true, data: subcategoriesWithFullImageUrls });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// BULK update published status
router.put("/bulk", async (req, res) => {
  try {
    const { ids, published } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, error: "No subcategory IDs provided" });

    const objectIds = ids
      .map(id => {
        try { return new ObjectId(id); }
        catch { return null; }
      })
      .filter(Boolean);

    if (objectIds.length === 0)
      return res.status(400).json({ success: false, error: "No valid IDs provided" });

    const result = await Subcategory.updateMany(
      { _id: { $in: objectIds } },
      { $set: { published, updated_at: new Date() } }
    );

    res.json({ success: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// BULK delete subcategories
router.delete("/bulk", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, error: "No subcategory IDs provided" });

    const objectIds = ids
      .map(id => {
        try { return new ObjectId(id); }
        catch { return null; }
      })
      .filter(Boolean);

    if (objectIds.length === 0)
      return res.status(400).json({ success: false, error: "No valid IDs provided" });

    // Fetch subcategories to delete their images
    const subcategoriesToDelete = await Subcategory.find({ _id: { $in: objectIds } });

    for (const subcat of subcategoriesToDelete) {
      if (subcat.image_url) {
        const imagePath = path.join(uploadDir, path.basename(subcat.image_url));
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      }
    }

    // Delete subcategories
    const result = await Subcategory.deleteMany({ _id: { $in: objectIds } });

    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --------------------------
// GET subcategories for dropdown (by category)
// --------------------------
router.get("/dropdown/:categoryId", async (req, res) => {
  try {
    const { categoryId } = req.params;

    const subcategories = await Subcategory.find({
      category_id: categoryId
    })
      .select("name slug")
      .sort({ name: 1 });

    res.json({ success: true, data: subcategories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;