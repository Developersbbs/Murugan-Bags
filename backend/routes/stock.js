const express = require("express");
const Stock = require("../models/Stock.js");
const Product = require("../models/Product.js");
const router = express.Router();

// HELPER: Update product stock and status based on stock entry
async function syncProductWithStock(stockEntry) {
  try {
    console.log('=== SYNCING PRODUCT WITH STOCK ===');
    console.log('Stock Entry:', {
      productId: stockEntry.productId,
      variantId: stockEntry.variantId,
      quantity: stockEntry.quantity,
      minStock: stockEntry.minStock
    });

    const product = await Product.findById(stockEntry.productId);
    if (!product) {
      console.error('Product not found for stock entry:', stockEntry.productId);
      return { success: false, message: 'Product not found' };
    }

    // Digital products don't need stock updates
    if (product.product_type === 'digital') {
      console.log('Digital product - skipping stock sync');
      return { success: true, message: 'Digital product - no sync needed' };
    }

    let updateData = {};
    let statusMessage = '';

    // Update variant stock
    if (stockEntry.variantId) {
      console.log('Updating variant stock for variantId:', stockEntry.variantId);
      
      // Find the variant in the product
      const variantIndex = product.product_variants.findIndex(
        v => v._id.toString() === stockEntry.variantId.toString()
      );

      if (variantIndex === -1) {
        console.error('Variant not found:', stockEntry.variantId);
        return { success: false, message: 'Variant not found' };
      }

      // Update the specific variant's stock and minStock
      updateData[`product_variants.${variantIndex}.stock`] = stockEntry.quantity;
      updateData[`product_variants.${variantIndex}.minStock`] = stockEntry.minStock;

      // Determine variant status and published state
      const isOutOfStock = stockEntry.quantity <= 0;
      const isLowStock = stockEntry.quantity > 0 && stockEntry.quantity <= stockEntry.minStock;

      // Update variant status and published state
      if (isOutOfStock) {
        updateData[`product_variants.${variantIndex}.status`] = 'out_of_stock';
        updateData[`product_variants.${variantIndex}.published`] = true; // Keep published for out_of_stock
        statusMessage = `Variant out of stock`;
      } else if (isLowStock) {
        updateData[`product_variants.${variantIndex}.status`] = 'low_stock';
        updateData[`product_variants.${variantIndex}.published`] = true; // Keep published for low_stock
        statusMessage = `Variant low stock (${stockEntry.quantity}/${stockEntry.minStock})`;
      } else {
        updateData[`product_variants.${variantIndex}.status`] = 'selling';
        updateData[`product_variants.${variantIndex}.published`] = true; // Ensure published for selling
        statusMessage = `Variant stock updated (${stockEntry.quantity}/${stockEntry.minStock})`;
      }

      console.log('Variant update data:', updateData);

      // Apply the update
      await Product.findByIdAndUpdate(
        stockEntry.productId,
        { $set: updateData },
        { new: true }
      );

      // After updating variant, check if product should be updated based on ALL variants
      const updatedProduct = await Product.findById(stockEntry.productId);
      await updateProductStatusBasedOnVariants(updatedProduct);

    } else {
      // Update base product stock (for simple products)
      console.log('Updating base product stock');
      
      updateData.baseStock = stockEntry.quantity;
      updateData.minStock = stockEntry.minStock;

      // Determine product status and published state
      const isOutOfStock = stockEntry.quantity <= 0;
      const isLowStock = stockEntry.quantity > 0 && stockEntry.quantity <= stockEntry.minStock;

      if (isOutOfStock) {
        updateData.status = 'out_of_stock';
        updateData.published = true; // Keep published for out_of_stock
        statusMessage = `Product out of stock`;
      } else if (isLowStock) {
        updateData.status = 'low_stock';
        updateData.published = true; // Keep published for low_stock
        statusMessage = `Product low stock (${stockEntry.quantity}/${stockEntry.minStock})`;
      } else {
        updateData.status = 'selling';
        updateData.published = true; // Ensure published for selling
        statusMessage = `Product stock updated (${stockEntry.quantity}/${stockEntry.minStock})`;
      }

      console.log('Base product update data:', updateData);

      await Product.findByIdAndUpdate(
        stockEntry.productId,
        updateData,
        { new: true }
      );
    }

    console.log('✅ Product synced successfully:', statusMessage);
    return { success: true, message: statusMessage };

  } catch (error) {
    console.error('Error syncing product with stock:', error);
    return { success: false, message: error.message };
  }
}

// HELPER: Update product status based on all variants
async function updateProductStatusBasedOnVariants(product) {
  try {
    if (product.product_structure !== 'variant' || !product.product_variants || product.product_variants.length === 0) {
      return;
    }

    console.log('=== UPDATING PRODUCT STATUS BASED ON VARIANTS ===');

    // Count variants by status
    const availableVariants = product.product_variants.filter(v => 
      v.published && v.status === 'selling'
    );
    const lowStockVariants = product.product_variants.filter(v => 
      v.published && v.status === 'low_stock'
    );
    const outOfStockVariants = product.product_variants.filter(v => 
      v.status === 'out_of_stock'
    );

    console.log('Variant counts:', {
      total: product.product_variants.length,
      available: availableVariants.length,
      lowStock: lowStockVariants.length,
      outOfStock: outOfStockVariants.length
    });

    let productUpdate = {};

    // Determine overall product status and published state
    if (availableVariants.length === 0) {
      // No available variants
      if (outOfStockVariants.length === product.product_variants.length) {
        // All variants are out of stock
        productUpdate.status = 'out_of_stock';
        productUpdate.published = true; // Keep published for out_of_stock
        console.log('All variants out of stock');
      } else {
        // Some variants are draft or unpublished
        productUpdate.status = 'draft';
        productUpdate.published = false; // Unpublish for draft status
        console.log('No available variants - setting to draft');
      }
    } else if (lowStockVariants.length > 0 && availableVariants.length === lowStockVariants.length) {
      // All available variants are low stock
      productUpdate.status = 'low_stock';
      productUpdate.published = true; // Keep published for low_stock
      console.log('All available variants are low stock');
    } else {
      // At least one variant is selling normally
      productUpdate.status = 'selling';
      productUpdate.published = true; // Ensure published for selling
      console.log('Product has variants available for sale');
    }

    // Only update if status has changed
    if (productUpdate.status && productUpdate.status !== product.status) {
      await Product.findByIdAndUpdate(
        product._id,
        productUpdate,
        { new: true }
      );
      console.log('✅ Product status updated to:', productUpdate.status);
    }

  } catch (error) {
    console.error('Error updating product status based on variants:', error);
  }
}

// HELPER: Bulk sync products with stock entries
async function bulkSyncProductsWithStock(stockEntries) {
  const results = {
    success: 0,
    failed: 0,
    messages: []
  };

  for (const stockEntry of stockEntries) {
    const syncResult = await syncProductWithStock(stockEntry);
    if (syncResult.success) {
      results.success++;
    } else {
      results.failed++;
    }
    results.messages.push({
      stockId: stockEntry._id,
      productId: stockEntry.productId,
      variantId: stockEntry.variantId,
      ...syncResult
    });
  }

  return results;
}

// GET all stock entries with optional filtering
router.get("/", async (req, res) => {
  try {
    const { productId, variantId, lowStock, location, page = 1, limit = 10 } = req.query;

    let query = {};

    if (productId) query.productId = productId;
    if (variantId) query.variantId = variantId;
    if (location) query.location = location;
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$quantity', '$minStock'] };
    }

    const skip = (page - 1) * limit;

    const stocks = await Stock.find(query)
      .populate({
        path: 'productId',
        select: 'name slug sku product_variants product_type',
        populate: {
          path: 'product_variants',
          select: 'slug name'
        }
      })
      .sort({ updated_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Stock.countDocuments(query);

    res.json({
      success: true,
      data: stocks,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalItems: total,
      limit: parseInt(limit),
      prevPage: parseInt(page) > 1 ? parseInt(page) - 1 : null,
      nextPage: parseInt(page) < Math.ceil(total / limit) ? parseInt(page) + 1 : null
    });
  } catch (err) {
    console.error('Get stock entries error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// GET single stock entry by ID
router.get("/:id", async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id)
      .populate({
        path: 'productId',
        select: 'name slug sku product_variants product_type',
        populate: {
          path: 'product_variants',
          select: 'slug name'
        }
      })

    if (!stock) {
      return res.status(404).json({ 
        success: false, 
        error: "Stock entry not found" 
      });
    }

    res.json({ 
      success: true, 
      data: stock 
    });
  } catch (err) {
    console.error('Get stock entry error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// POST create new stock entry
router.post("/", async (req, res) => {
  try {
    // Check if product exists
    const product = await Product.findById(req.body.productId);
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        error: "Product not found" 
      });
    }

    // Check if stock entry already exists for this product/variant
    const existingStock = await Stock.findOne({
      productId: req.body.productId,
      variantId: req.body.variantId || null
    });

    if (existingStock) {
      return res.status(400).json({ 
        success: false, 
        error: "Stock entry already exists for this product/variant" 
      });
    }

    const stock = new Stock(req.body);
    await stock.save();

    // Sync product with new stock entry
    await syncProductWithStock(stock);

    // Populate the response
    await stock.populate({
      path: 'productId',
      select: 'name slug sku product_variants product_type',
      populate: {
        path: 'product_variants',
        select: 'slug name'
      }
    });

    res.status(201).json({ 
      success: true, 
      data: stock,
      message: 'Stock entry created and product synced successfully'
    });
  } catch (err) {
    console.error('Create stock entry error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// PUT update stock entry
router.put("/:id", async (req, res) => {
  try {
    const stock = await Stock.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updated_at: new Date() },
      { new: true, runValidators: true }
    )
      .populate({
        path: 'productId',
        select: 'name slug sku product_variants product_type',
        populate: {
          path: 'product_variants',
          select: 'slug name'
        }
      })

    if (!stock) {
      return res.status(404).json({ 
        success: false, 
        error: "Stock entry not found" 
      });
    }

    // Sync product with updated stock entry
    const syncResult = await syncProductWithStock(stock);

    res.json({ 
      success: true, 
      data: stock,
      syncResult: syncResult
    });
  } catch (err) {
    console.error('Update stock entry error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// PATCH quick update stock quantity
router.patch("/:id/quantity", async (req, res) => {
  try {
    const { quantity, notes } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: "Quantity is required" 
      });
    }

    const stock = await Stock.findByIdAndUpdate(
      req.params.id,
      { 
        quantity: quantity,
        ...(notes && { notes }),
        updated_at: new Date() 
      },
      { new: true, runValidators: true }
    )
      .populate({
        path: 'productId',
        select: 'name slug sku product_variants product_type',
        populate: {
          path: 'product_variants',
          select: 'slug name'
        }
      })

    if (!stock) {
      return res.status(404).json({ 
        success: false, 
        error: "Stock entry not found" 
      });
    }

    // Sync product with updated stock entry
    const syncResult = await syncProductWithStock(stock);

    res.json({ 
      success: true, 
      data: stock,
      syncResult: syncResult
    });
  } catch (err) {
    console.error('Update stock quantity error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// DELETE stock entry
router.delete("/:id", async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) {
      return res.status(404).json({ 
        success: false, 
        error: "Stock entry not found" 
      });
    }

    // Get the product before deleting stock
    const product = await Product.findById(stock.productId);

    // Delete the stock entry
    await Stock.findByIdAndDelete(req.params.id);

    // Update the corresponding product/variant
    if (product) {
      if (stock.variantId) {
        // Update variant
        const variantIndex = product.product_variants.findIndex(
          v => v._id.toString() === stock.variantId.toString()
        );

        if (variantIndex !== -1) {
          await Product.findByIdAndUpdate(
            stock.productId,
            {
              $set: {
                [`product_variants.${variantIndex}.stock`]: 0,
                [`product_variants.${variantIndex}.status`]: 'out_of_stock',
                [`product_variants.${variantIndex}.published`]: true
              }
            }
          );

          // Update product status based on all variants
          const updatedProduct = await Product.findById(stock.productId);
          await updateProductStatusBasedOnVariants(updatedProduct);
        }
      } else {
        // Update base product
        await Product.findByIdAndUpdate(stock.productId, {
          baseStock: 0,
          status: 'out_of_stock',
          published: true
        });
      }
    }

    res.json({ 
      success: true, 
      message: "Stock entry deleted and product updated successfully" 
    });
  } catch (err) {
    console.error('Delete stock entry error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// BULK UPDATE stock entries
router.post("/bulk-update", async (req, res) => {
  try {
    const updates = req.body.updates; // Array of { id, quantity, minStock, notes }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Updates array is required" 
      });
    }

    const results = [];
    const syncResults = [];

    for (const update of updates) {
      try {
        const updateData = {
          ...(update.quantity !== undefined && { quantity: update.quantity }),
          ...(update.minStock !== undefined && { minStock: update.minStock }),
          ...(update.notes && { notes: update.notes }),
          updated_at: new Date()
        };

        const stock = await Stock.findByIdAndUpdate(
          update.id,
          updateData,
          { new: true }
        );

        if (stock) {
          results.push(stock);
          
          // Sync product with updated stock
          const syncResult = await syncProductWithStock(stock);
          syncResults.push({
            stockId: stock._id,
            productId: stock.productId,
            variantId: stock.variantId,
            ...syncResult
          });
        }
      } catch (updateError) {
        console.error(`Error updating stock ${update.id}:`, updateError);
        syncResults.push({
          stockId: update.id,
          success: false,
          message: updateError.message
        });
      }
    }

    res.json({ 
      success: true,
      message: "Bulk update completed", 
      updated: results.length,
      results: results,
      syncResults: syncResults
    });
  } catch (err) {
    console.error('Bulk update error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// BULK SYNC - Manually trigger sync for all stock entries
router.post("/bulk-sync", async (req, res) => {
  try {
    const { productId, variantId } = req.body;

    let query = {};
    if (productId) query.productId = productId;
    if (variantId) query.variantId = variantId;

    const stocks = await Stock.find(query);

    if (stocks.length === 0) {
      return res.json({
        success: true,
        message: 'No stock entries to sync',
        results: { success: 0, failed: 0, messages: [] }
      });
    }

    console.log(`Starting bulk sync for ${stocks.length} stock entries`);
    const syncResults = await bulkSyncProductsWithStock(stocks);

    res.json({
      success: true,
      message: `Bulk sync completed: ${syncResults.success} successful, ${syncResults.failed} failed`,
      results: syncResults
    });
  } catch (err) {
    console.error('Bulk sync error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// EXPORT stock data as CSV
router.get("/export/csv", async (req, res) => {
  try {
    const { productId, variantId, lowStock } = req.query;

    let query = {};

    if (productId) query.productId = productId;
    if (variantId) query.variantId = variantId;
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$quantity', '$minStock'] };
    }

    const stocks = await Stock.find(query)
      .populate({
        path: 'productId',
        select: 'name slug sku product_variants product_type',
        populate: {
          path: 'product_variants',
          select: 'slug name'
        }
      })
      .sort({ updated_at: -1 });

    // Convert to CSV format
    const csvHeaders = [
      'Product Name',
      'SKU',
      'Product Type',
      'Variant',
      'Quantity',
      'Min Stock',
      'Status',
      'Notes',
      'Last Updated',
    ];
    
    const csvRows = stocks.map(stock => {
      const variant = stock.productId?.product_variants?.find(
        v => v._id.toString() === stock.variantId?.toString()
      );
      
      // Determine status
      let status = 'In Stock';
      if (stock.quantity <= 0) {
        status = 'Out of Stock';
      } else if (stock.quantity <= stock.minStock) {
        status = 'Low Stock';
      }

      return [
        stock.productId?.name || 'Unknown',
        stock.productId?.sku || 'N/A',
        stock.productId?.product_type || 'physical',
        variant ? variant.slug : 'Base Product',
        stock.quantity,
        stock.minStock,
        status,
        stock.notes || '',
        stock.updated_at ? new Date(stock.updated_at).toLocaleDateString() : '',
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="stock_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('Export CSV error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// EXPORT stock data as JSON
router.get("/export/json", async (req, res) => {
  try {
    const { productId, variantId, lowStock } = req.query;

    let query = {};

    if (productId) query.productId = productId;
    if (variantId) query.variantId = variantId;
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$quantity', '$minStock'] };
    }

    const stocks = await Stock.find(query)
      .populate({
        path: 'productId',
        select: 'name slug sku product_variants product_type',
        populate: {
          path: 'product_variants',
          select: 'slug name'
        }
      })
      .sort({ updated_at: -1 });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="stock_${new Date().toISOString().split('T')[0]}.json"`);
    res.json({
      success: true,
      data: stocks,
      exportedAt: new Date().toISOString(),
      count: stocks.length
    });
  } catch (err) {
    console.error('Export JSON error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// GET low stock alerts
router.get("/alerts/low-stock", async (req, res) => {
  try {
    const { threshold = 1 } = req.query;

    // Find all stock entries where quantity is at or below minStock
    const lowStockEntries = await Stock.find({
      $expr: { $lte: ['$quantity', { $multiply: ['$minStock', parseFloat(threshold)] }] }
    })
      .populate({
        path: 'productId',
        select: 'name slug sku product_variants product_type published status',
        populate: {
          path: 'product_variants',
          select: 'slug name published status'
        }
      })
      .sort({ quantity: 1 }); // Lowest stock first

    // Format the alerts
    const alerts = lowStockEntries.map(stock => {
      const variant = stock.productId?.product_variants?.find(
        v => v._id.toString() === stock.variantId?.toString()
      );

      return {
        _id: stock._id,
        productId: stock.productId?._id,
        productName: stock.productId?.name,
        productSku: stock.productId?.sku,
        productType: stock.productId?.product_type,
        variantId: stock.variantId,
        variantName: variant?.name,
        variantSlug: variant?.slug,
        quantity: stock.quantity,
        minStock: stock.minStock,
        shortfall: stock.minStock - stock.quantity,
        severity: stock.quantity <= 0 ? 'critical' : 
                  stock.quantity <= (stock.minStock * 0.5) ? 'high' : 'medium',
        isPublished: variant ? variant.published : stock.productId?.published,
        status: variant ? variant.status : stock.productId?.status,
        notes: stock.notes
      };
    });

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
      criticalCount: alerts.filter(a => a.severity === 'critical').length,
      highCount: alerts.filter(a => a.severity === 'high').length,
      mediumCount: alerts.filter(a => a.severity === 'medium').length
    });
  } catch (err) {
    console.error('Low stock alerts error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

module.exports = router;