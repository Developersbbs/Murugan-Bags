const express = require("express");
const Coupon = require("../models/Coupon");
const router = express.Router();

// ✅ GET all coupons with pagination + search
router.get("/", async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = {};

    // optional search by code or campaign_name
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { campaign_name: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Coupon.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const coupons = await Coupon.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 });

    res.json({
      data: coupons,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET coupon by ID
router.get("/:id", async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ id: req.params.id });
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ CREATE coupon
router.post("/", async (req, res) => {
  try {
    const coupon = new Coupon(req.body);
    await coupon.save();
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ UPDATE coupon
router.put("/:id", async (req, res) => {
  try {
    const coupon = await Coupon.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE coupon
router.delete("/:id", async (req, res) => {
  try {
    const coupon = await Coupon.findOneAndDelete({ id: req.params.id });
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });
    res.json({ message: "Coupon deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/export/all", async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ created_at: -1 });
    res.json(coupons); // 👈 just return array
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export coupons to CSV
router.get("/export/csv", async (req, res) => {
  try {
    const { search } = req.query;

    // Build filter
    let filter = {};
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { code: { $regex: searchRegex } },
        { campaign_name: { $regex: searchRegex } }
      ];
    }

    const coupons = await Coupon.find(filter).sort({ created_at: -1 });

    if (coupons.length === 0) {
      return res.status(404).json({ success: false, error: "No coupons found to export" });
    }

    // Convert to CSV format
    const csvHeaders = [
      'ID',
      'Code',
      'Campaign Name',
      'Discount Type',
      'Discount Value',
      'Min Purchase',
      'Max Discount',
      'Usage Limit',
      'Used Count',
      'Valid From',
      'Valid Until',
      'Active',
      'Created At'
    ];

    const csvRows = coupons.map(coupon => [
      coupon.id,
      coupon.code || '',
      coupon.campaign_name || '',
      coupon.discount_type || '',
      coupon.discount_value || 0,
      coupon.min_purchase || 0,
      coupon.max_discount || 0,
      coupon.usage_limit || 0,
      coupon.used_count || 0,
      coupon.valid_from || '',
      coupon.valid_until || '',
      coupon.is_active ? 'Yes' : 'No',
      coupon.createdAt || coupon.created_at
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="coupons_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export coupons to JSON
router.get("/export/json", async (req, res) => {
  try {
    const { search } = req.query;

    // Build filter
    let filter = {};
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { code: { $regex: searchRegex } },
        { campaign_name: { $regex: searchRegex } }
      ];
    }

    const coupons = await Coupon.find(filter).sort({ created_at: -1 });

    if (coupons.length === 0) {
      return res.status(404).json({ success: false, error: "No coupons found to export" });
    }

    const exportData = coupons.map(coupon => ({
      id: coupon.id,
      code: coupon.code,
      campaignName: coupon.campaign_name,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      minPurchase: coupon.min_purchase,
      maxDiscount: coupon.max_discount,
      usageLimit: coupon.usage_limit,
      usedCount: coupon.used_count,
      validFrom: coupon.valid_from,
      validUntil: coupon.valid_until,
      isActive: coupon.is_active,
      createdAt: coupon.createdAt || coupon.created_at,
      updatedAt: coupon.updatedAt || coupon.updated_at
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="coupons_${new Date().toISOString().split('T')[0]}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      totalRecords: exportData.length,
      filters: {
        search: search || null
      },
      data: exportData
    });
  } catch (err) {
    console.error('JSON export error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


module.exports = router;
