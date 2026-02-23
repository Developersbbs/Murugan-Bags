const express = require("express");
const { authenticateToken } = require("./auth");
const mongoose = require("mongoose");
const { upload } = require("../middleware/upload");
const Staff = require("../models/Staff.js");
const router = express.Router();

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  if (!id) return false;
  // Convert to string if it's an ObjectId object
  const stringId = id.toString ? id.toString() : id;
  return mongoose.Types.ObjectId.isValid(stringId);
};

// GET all staff
router.get("/", async (req, res) => {
  try {
    const staff = await Staff.find();
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET by ID (protected route)
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    console.log("GET by ID request received:");
    console.log("Params ID:", req.params.id);
    console.log("User from token:", req.user);

    // Validate ID parameter
    if (!req.params.id) {
      console.error("Staff get by ID: No ID provided");
      return res.status(400).json({ success: false, error: "Staff ID is required" });
    }

    // Validate ObjectId format using mongoose
    if (!isValidObjectId(req.params.id)) {
      console.error("Staff get by ID: Invalid ObjectId format:", req.params.id);
      return res.status(400).json({ success: false, error: "Invalid staff ID format" });
    }

    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      console.error("Staff get by ID: Staff not found:", req.params.id);
      return res.status(404).json({ success: false, error: "Staff not found" });
    }

    console.log("Staff get by ID: Staff found:", staff._id, staff.email);

    res.json({ success: true, data: staff });
  } catch (err) {
    console.error("Staff get by ID: Database error:", err);

    // Handle specific MongoDB CastError for invalid ObjectId
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      return res.status(400).json({ success: false, error: "Invalid staff ID format" });
    }

    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE
router.post("/", upload.single('image'), async (req, res) => {
  try {
    console.log("CREATE request received:");
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);
    console.log("Content-Type:", req.get('content-type'));

    // Handle both JSON and form data
    let staffData = req.body;

    if (req.file) {
      staffData.image_url = req.file.firebaseUrl || `/uploads/staff/${req.file.filename}`;
      console.log("File uploaded for new staff:", req.file.filename);
    }

    // If request is JSON with image_url (no file upload)
    if (req.is('application/json') && staffData.image_url && !req.file) {
      console.log("JSON create with image_url, no file upload");
    }

    const newStaff = new Staff(staffData);
    await newStaff.save();
    res.status(201).json({ success: true, data: newStaff });
  } catch (err) {
    console.error("Staff creation error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// UPDATE without ID in URL - handles profile updates using authenticated user
router.put("/", authenticateToken, upload.single('image'), async (req, res) => {
  try {
    console.log("UPDATE request received:");
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);
    console.log("Content-Type:", req.get('content-type'));
    console.log("Authenticated user:", req.user);

    // Get user ID from authenticated token (this is the logged-in user)
    let staffId = req.user?.id;

    console.log("DEBUG - User ID from token:", staffId);

    // Validate that we have a valid authenticated user
    if (!staffId) {
      return res.status(401).json({ success: false, error: "User not authenticated" });
    }

    // Validate ObjectId format using mongoose
    if (!isValidObjectId(staffId)) {
      console.error("Invalid ObjectId format from token:", staffId);
      return res.status(400).json({ success: false, error: "Invalid user ID format" });
    }

    console.log("Updating profile for authenticated user:", staffId);

    // Handle both JSON and form data for UPDATE
    let updateData = req.body;

    // Remove any ID fields from request body to avoid conflicts
    delete updateData.id;
    delete updateData._id;

    if (req.file) {
      updateData.image_url = req.file.firebaseUrl || `/uploads/staff/${req.file.filename}`;
      console.log("File uploaded:", req.file.filename);
    }

    // If request is JSON with image_url (no file upload)
    if (req.is('application/json') && updateData.image_url && !req.file) {
      console.log("JSON update with image_url, no file upload");
    }

    // Update the authenticated user's profile
    const updatedStaff = await Staff.findByIdAndUpdate(
      staffId,
      updateData,
      { new: true }
    );

    if (!updatedStaff) {
      return res.status(404).json({ success: false, error: "User profile not found" });
    }

    console.log("Profile updated successfully for user:", staffId);
    res.json({ success: true, data: updatedStaff, message: "Profile updated successfully" });
  } catch (err) {
    console.error("Profile update error:", err);

    // Handle specific MongoDB CastError for invalid ObjectId
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      return res.status(400).json({ success: false, error: "Invalid user ID format" });
    }

    res.status(400).json({ success: false, error: err.message });
  }
});

// UPDATE with ID in URL
router.put("/:id", upload.single('image'), async (req, res) => {
  try {
    console.log("UPDATE (with ID) request received:");
    console.log("Params ID:", req.params.id);
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);
    console.log("Content-Type:", req.get('content-type'));

    // Get ID from URL params
    let staffId = req.params.id;

    // Check if ID is undefined or invalid
    if (!staffId || staffId === 'undefined') {
      console.log("ID is undefined - redirecting to create logic");

      // Handle both JSON and form data
      let staffData = req.body;

      // If request is multipart/form-data with file upload
      if (req.file) {
        staffData.image_url = `/uploads/staff/${req.file.filename}`;
        console.log("File uploaded for new staff:", req.file.filename);
      }

      // If request is JSON with image_url (no file upload)
      if (req.is('application/json') && staffData.image_url && !req.file) {
        console.log("JSON create with image_url, no file upload");
      }

      const newStaff = new Staff(staffData);
      await newStaff.save();
      return res.status(201).json({ success: true, data: newStaff, message: "Staff created successfully" });
    }

    // Validate ObjectId format using mongoose
    if (!isValidObjectId(staffId)) {
      console.error("Invalid ObjectId format:", staffId);
      return res.status(400).json({ success: false, error: "Invalid staff ID format" });
    }

    // Handle both JSON and form data for UPDATE
    let updateData = req.body;

    // Remove ID fields from update data to avoid conflicts
    delete updateData.id;
    delete updateData._id;

    if (req.file) {
      updateData.image_url = req.file.firebaseUrl || `/uploads/staff/${req.file.filename}`;
      console.log("File uploaded:", req.file.filename);
    }

    // If request is JSON with image_url (no file upload)
    if (req.is('application/json') && updateData.image_url && !req.file) {
      console.log("JSON update with image_url, no file upload");
    }

    const updatedStaff = await Staff.findByIdAndUpdate(
      staffId,
      updateData,
      { new: true }
    );
    if (!updatedStaff) return res.status(404).json({ success: false, error: "Staff not found" });
    res.json({ success: true, data: updatedStaff, message: "Staff updated successfully" });
  } catch (err) {
    console.error("Staff update (with ID): Database error:", err);

    // Handle specific MongoDB CastError for invalid ObjectId
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      return res.status(400).json({ success: false, error: "Invalid staff ID format" });
    }

    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    // Validate ID parameter
    if (!req.params.id) {
      return res.status(400).json({ success: false, error: "Staff ID is required" });
    }

    // Validate ObjectId format using mongoose
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: "Invalid staff ID format" });
    }

    const deletedStaff = await Staff.findByIdAndDelete(req.params.id);
    if (!deletedStaff) return res.status(404).json({ success: false, error: "Staff not found" });
    res.json({ success: true, message: "Staff deleted successfully" });
  } catch (err) {
    console.error("Staff delete: Database error:", err);

    // Handle specific MongoDB CastError for invalid ObjectId
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      return res.status(400).json({ success: false, error: "Invalid staff ID format" });
    }

    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
