stockhelper.js

const Stock = require('../models/Stock.js');
const Product = require('../models/Product.js');
const Notification = require('../models/Notification.js');

// 🔔 Create notification (once per day per product)
async function createStockNotification(product, isVariant, isOutOfStock) {
  const title = isOutOfStock
    ? isVariant ? `${product.name} - Variant Out of Stock ❌` : `${product.name} Out of Stock ❌`
    : isVariant ? `${product.name} - Variant Low Stock 🚨` : `${product.name} Low Stock 🚨`;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const existing = await Notification.findOne({
    title,
    created_at: { $gte: todayStart },
  });

  if (existing) {
    console.log("🔕 Notification already exists today for:", title);
    return;
  }

  const rawImage = Array.isArray(product.images) ? product.images[0] : product.image_url;
  const image_url = typeof rawImage === "string" ? rawImage : (rawImage?.url || "");

  const type = isOutOfStock ? "out_of_stock" : "low_stock";

  await Notification.create({
    title,
    type,
    image_url,
    is_read: false,
    published: true,
    staff_id: "admin",
  });

  console.log("🔔 Notification created:", title);
}

async function deductStockForOrder(orderItems, invoiceNo) {
  console.log(`=== DEDUCTING STOCK FOR ORDER: ${invoiceNo} ===`);

  for (const item of orderItems) {
    try {
      console.log(`Processing: productId=${item.product_id}, variantId=${item.variant_id}, qty=${item.quantity}`);

      const stockEntry = await Stock.findOne({
        productId: item.product_id,
        variantId: item.variant_id || null,
      });

      if (!stockEntry) {
        console.log(`⚠️ No stock entry found for product: ${item.product_id}`);
        continue;
      }

      const oldQty = stockEntry.quantity;
      const newQty = Math.max(0, oldQty - item.quantity);

      // Update stock quantity
      stockEntry.quantity = newQty;
      stockEntry.notes = `Deducted ${item.quantity} unit(s) via order ${invoiceNo}. Was: ${oldQty}, Now: ${newQty}`;
      stockEntry.updated_at = new Date();
      await stockEntry.save();

      console.log(`✅ Stock entry updated: ${oldQty} → ${newQty}`);

      // ✅ Find the product for notification + status update
      const product = await Product.findById(item.product_id);
      if (!product) {
        console.log(`⚠️ Product not found for id: ${item.product_id}`);
        continue;
      }

      const isOutOfStock = newQty <= 0;
      const isLowStock = newQty > 0 && newQty <= stockEntry.minStock;

      console.log(`📊 isOutOfStock: ${isOutOfStock} | isLowStock: ${isLowStock} | qty: ${newQty} | minStock: ${stockEntry.minStock}`);

      // 🔔 Send notification if needed
      if (isOutOfStock || isLowStock) {
        await createStockNotification(product, !!item.variant_id, isOutOfStock);
      }

      // ✅ Update product/variant status
      if (item.variant_id) {
        const variantIndex = product.product_variants.findIndex(
          (v) => v._id.toString() === item.variant_id.toString()
        );

        if (variantIndex !== -1) {
          const updateData = {
            [`product_variants.${variantIndex}.stock`]: newQty,
          };

          if (isOutOfStock) {
            updateData[`product_variants.${variantIndex}.status`] = "out_of_stock";
          } else if (isLowStock) {
            updateData[`product_variants.${variantIndex}.status`] = "low_stock";
          } else {
            updateData[`product_variants.${variantIndex}.status`] = "selling";
          }

          await Product.findByIdAndUpdate(
            item.product_id,
            { $set: updateData },
            { new: true }
          );
        }
      } else {
        // Simple product
        const productUpdate = { baseStock: newQty };

        if (isOutOfStock) {
          productUpdate.status = "out_of_stock";
        } else if (isLowStock) {
          productUpdate.status = "low_stock";
        } else {
          productUpdate.status = "selling";
        }

        await Product.findByIdAndUpdate(item.product_id, productUpdate, { new: true });
      }

    } catch (err) {
      console.error(`❌ Error deducting stock for item:`, item, err.message);
    }
  }

  console.log(`=== STOCK DEDUCTION COMPLETE FOR ORDER: ${invoiceNo} ===`);
}

module.exports = { deductStockForOrder };