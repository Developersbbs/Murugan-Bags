const express = require("express");
const Notification = require("../models/Notification.js");
const router = express.Router();

// GET all notifications
router.get("/", async (req, res) => {
  try {
    const notifications = await Notification.find();
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single notification by id
router.get("/:id", async (req, res) => {
  try {
    const notification = await Notification.findOne({ id: req.params.id });
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new notification
router.post("/", async (req, res) => {
  try {
    const notification = new Notification(req.body);
    await notification.save();
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update notification
router.put("/:id", async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE notification
router.delete("/:id", async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ id: req.params.id });
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.json({ message: "Notification deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
