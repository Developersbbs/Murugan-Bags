const express = require("express");
const InventoryLog = require("../models/InventoryLog.js");
const router = express.Router();

// GET all inventory logs
router.get("/", async (req, res) => {
  try {
    const logs = await InventoryLog.find();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single inventory log by id
router.get("/:id", async (req, res) => {
  try {
    const log = await InventoryLog.findOne({ id: req.params.id });
    if (!log) return res.status(404).json({ error: "Inventory log not found" });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new inventory log
router.post("/", async (req, res) => {
  try {
    const log = new InventoryLog(req.body);
    await log.save();
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update inventory log
router.put("/:id", async (req, res) => {
  try {
    const log = await InventoryLog.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    if (!log) return res.status(404).json({ error: "Inventory log not found" });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE inventory log
router.delete("/:id", async (req, res) => {
  try {
    const log = await InventoryLog.findOneAndDelete({ id: req.params.id });
    if (!log) return res.status(404).json({ error: "Inventory log not found" });
    res.json({ message: "Inventory log deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
