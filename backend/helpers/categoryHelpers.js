// Helper functions for managing category-subcategory relationships
const mongoose = require('mongoose');
const CategorySubcategoryMap = require('../models/CategorySubcategoryMap');
const Category = require('../models/Category');
const Subcategory = require('../models/Subcategory');

// Add subcategory to category
async function addSubcategoryToCategory(categoryId, subcategoryId, options = {}) {
  const { sort_order = 0, is_primary = false, created_by = null } = options;

  // Check if mapping already exists
  const existing = await CategorySubcategoryMap.findOne({
    category_id: categoryId,
    subcategory_id: subcategoryId
  });

  if (existing) {
    throw new Error('Subcategory is already associated with this category');
  }

  // If this is primary, remove primary flag from other mappings
  if (is_primary) {
    await CategorySubcategoryMap.updateMany(
      { subcategory_id: subcategoryId, is_primary: true },
      { is_primary: false }
    );
  }

  const mapping = new CategorySubcategoryMap({
    category_id: categoryId,
    subcategory_id: subcategoryId,
    sort_order,
    is_primary,
    created_by
  });

  return await mapping.save();
}

// Remove subcategory from category
async function removeSubcategoryFromCategory(categoryId, subcategoryId) {
  const result = await CategorySubcategoryMap.findOneAndDelete({
    category_id: categoryId,
    subcategory_id: subcategoryId
  });

  if (!result) {
    throw new Error('Subcategory is not associated with this category');
  }

  return result;
}

// Get all subcategories under a category
async function getSubcategoriesByCategory(categoryId, options = {}) {
  const { published = true, limit = 50, skip = 0 } = options;

  const matchStage = {
    category_id: mongoose.Types.ObjectId(categoryId)
  };

  if (published !== undefined) {
    matchStage['subcategories.published'] = published;
  }

  return await CategorySubcategoryMap.aggregate([
    {
      $match: matchStage
    },
    {
      $lookup: {
        from: 'subcategories',
        localField: 'subcategory_id',
        foreignField: '_id',
        as: 'subcategory'
      }
    },
    {
      $unwind: '$subcategory'
    },
    {
      $match: published !== undefined ? { 'subcategory.published': published } : {}
    },
    {
      $sort: { sort_order: 1, 'subcategory.name': 1 }
    },
    {
      $skip: skip
    },
    {
      $limit: limit
    },
    {
      $project: {
        _id: '$subcategory._id',
        name: '$subcategory.name',
        description: '$subcategory.description',
        slug: '$subcategory.slug',
        image_url: '$subcategory.image_url',
        sort_order: '$sort_order',
        is_primary: '$is_primary',
        published: '$subcategory.published'
      }
    }
  ]);
}

// Get all products under a category
async function getProductsByCategory(categoryId, options = {}) {
  const { published = true, limit = 50, skip = 0 } = options;

  return await CategorySubcategoryMap.aggregate([
    {
      $match: { category_id: mongoose.Types.ObjectId(categoryId) }
    },
    {
      $lookup: {
        from: 'subcategories',
        localField: 'subcategory_id',
        foreignField: '_id',
        as: 'subcategory'
      }
    },
    {
      $unwind: '$subcategory'
    },
    {
      $lookup: {
        from: 'Products',
        localField: 'subcategory._id',
        foreignField: 'subcategory_id',
        as: 'products'
      }
    },
    {
      $unwind: '$products'
    },
    {
      $match: published !== undefined ? { 'products.published': published } : {}
    },
    {
      $sort: { 'products.created_at': -1 }
    },
    {
      $skip: skip
    },
    {
      $limit: limit
    },
    {
      $project: {
        _id: '$products._id',
        name: '$products.name',
        sku: '$products.sku',
        slug: '$products.slug',
        selling_price: '$products.selling_price',
        stock: '$products.stock',
        image_url: '$products.image_url',
        subcategory: {
          _id: '$subcategory._id',
          name: '$subcategory.name',
          slug: '$subcategory.slug'
        }
      }
    }
  ]);
}

// Get all categories that share a given subcategory
async function getCategoriesBySubcategory(subcategoryId, options = {}) {
  const { published = true, limit = 50, skip = 0 } = options;

  return await CategorySubcategoryMap.aggregate([
    {
      $match: { subcategory_id: mongoose.Types.ObjectId(subcategoryId) }
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category_id',
        foreignField: '_id',
        as: 'category'
      }
    },
    {
      $unwind: '$category'
    },
    {
      $match: published !== undefined ? { 'category.published': published } : {}
    },
    {
      $sort: { sort_order: 1, 'category.name': 1 }
    },
    {
      $skip: skip
    },
    {
      $limit: limit
    },
    {
      $project: {
        _id: '$category._id',
        name: '$category.name',
        description: '$category.description',
        slug: '$category.slug',
        image_url: '$category.image_url',
        sort_order: '$sort_order',
        is_primary: '$is_primary',
        published: '$category.published'
      }
    }
  ]);
}

module.exports = {
  addSubcategoryToCategory,
  removeSubcategoryFromCategory,
  getSubcategoriesByCategory,
  getProductsByCategory,
  getCategoriesBySubcategory
};
