const express = require("express");
const OrderItem = require("../models/OrderItem.js");
const router = express.Router();

// GET all order items
router.get("/", async (req, res) => {
  try {
    const items = await OrderItem.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single item by id
router.get("/:id", async (req, res) => {
  try {
    const item = await OrderItem.findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new item
router.post("/", async (req, res) => {
  try {
    const item = new OrderItem(req.body);
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update item
router.put("/:id", async (req, res) => {
  try {
    const item = await OrderItem.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE item
router.delete("/:id", async (req, res) => {
  try {
    const item = await OrderItem.findOneAndDelete({ id: req.params.id });
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
