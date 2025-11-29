const express = require("express");
const router = express.Router();
const StaffRole = require("../models/StaffRole");

// GET all staff roles
router.get("/", async (req, res) => {
  try {
    const roles = await StaffRole.find();
    res.json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🔽 GET staff roles dropdown (only fields for dropdown)
router.get("/dropdown", async (req, res) => {
  try {
    // Select only required fields
    const roles = await StaffRole.find().select("name description");
    res.json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET by ID
router.get("/:id", async (req, res) => {
  try {
    const role = await StaffRole.findOne({ id: req.params.id });
    if (!role) {
      return res.status(404).json({ success: false, error: "Not found" });
    }
    res.json({ success: true, data: role });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST (create new role)
router.post("/", async (req, res) => {
  const role = new StaffRole(req.body);
  try {
    const savedRole = await role.save();
    res.status(201).json({ success: true, data: savedRole });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT (update by id)
router.put("/:id", async (req, res) => {
  try {
    const updatedRole = await StaffRole.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    if (!updatedRole) {
      return res.status(404).json({ success: false, error: "Not found" });
    }
    res.json({ success: true, data: updatedRole });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE (remove by id)
router.delete("/:id", async (req, res) => {
  try {
    const deletedRole = await StaffRole.findOneAndDelete({ id: req.params.id });
    if (!deletedRole) {
      return res.status(404).json({ success: false, error: "Not found" });
    }
    res.json({ success: true, data: deletedRole });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
