const express = require("express");
const Address = require("../models/Address.js");
const Customer = require("../models/Customer.js");
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// GET all addresses for a customer
router.get("/", authenticateToken, async (req, res) => {
  try {
    const customer_id = req.user.id;

    const addresses = await Address.find({ customer_id })
      .sort({ created_at: -1 });

    res.json({
      success: true,
      data: addresses
    });
  } catch (err) {
    console.error('Error fetching addresses:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// POST create new address
router.post("/", authenticateToken, async (req, res) => {
  try {
    const customer_id = req.user.id;
    const {
      type,
      // Structured fields
      firstName, lastName, email, phone, street, city, state, zipCode, country,
      // Legacy field for backward compatibility
      address,
      is_default = false
    } = req.body;

    // Validate required fields - support both structured and legacy formats
    if (!type) {
      return res.status(400).json({
        success: false,
        error: "Type is required"
      });
    }

    // Check if we have structured fields or legacy address
    const hasStructuredFields = firstName && lastName && email && phone && street && city && state && zipCode;
    const hasLegacyAddress = address && address.trim().length > 0;

    if (!hasStructuredFields && !hasLegacyAddress) {
      return res.status(400).json({
        success: false,
        error: "Either structured address fields (firstName, lastName, email, phone, street, city, state, zipCode) or a non-empty legacy address field must be provided"
      });
    }

    // Validate type
    if (!['Home', 'Work', 'Other'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: "Type must be Home, Work, or Other"
      });
    }

    // If this is set as default, unset other defaults
    if (is_default) {
      await Address.updateMany(
        { customer_id },
        { $set: { is_default: false } }
      );
    }

    const newAddress = new Address({
      customer_id,
      type,
      // Structured fields
      ...(hasStructuredFields && {
        firstName, lastName, email, phone, street, city, state, zipCode, country: country || 'USA'
      }),
      // Legacy field
      ...(hasLegacyAddress && { address }),
      is_default
    });

    const savedAddress = await newAddress.save();

    res.status(201).json({
      success: true,
      message: "Address created successfully",
      data: savedAddress
    });
  } catch (err) {
    console.error('Error creating address:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// PUT update address
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const customer_id = req.user.id;
    const addressId = req.params.id;
    const {
      type,
      // Structured fields
      firstName, lastName, email, phone, street, city, state, zipCode, country,
      // Legacy field
      address,
      is_default
    } = req.body;

    // Find the address and ensure it belongs to the customer
    const existingAddress = await Address.findOne({
      _id: addressId,
      customer_id
    });

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        error: "Address not found"
      });
    }

    // Validate type if provided
    if (type && !['Home', 'Work', 'Other'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: "Type must be Home, Work, or Other"
      });
    }

    // If this is set as default, unset other defaults
    if (is_default) {
      await Address.updateMany(
        { customer_id, _id: { $ne: addressId } },
        { $set: { is_default: false } }
      );
    }

    const updateData = {};
    if (type) updateData.type = type;

    // Handle structured fields
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (street !== undefined) updateData.street = street;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (zipCode !== undefined) updateData.zipCode = zipCode;
    if (country !== undefined) updateData.country = country;

    // Handle legacy field
    if (address !== undefined) updateData.address = address;

    if (is_default !== undefined) updateData.is_default = is_default;
    updateData.updated_at = new Date();

    const updatedAddress = await Address.findByIdAndUpdate(
      addressId,
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      message: "Address updated successfully",
      data: updatedAddress
    });
  } catch (err) {
    console.error('Error updating address:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// DELETE address
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const customer_id = req.user.id;
    const addressId = req.params.id;

    // Find and delete the address, ensuring it belongs to the customer
    const deletedAddress = await Address.findOneAndDelete({
      _id: addressId,
      customer_id
    });

    if (!deletedAddress) {
      return res.status(404).json({
        success: false,
        error: "Address not found"
      });
    }

    res.json({
      success: true,
      message: "Address deleted successfully"
    });
  } catch (err) {
    console.error('Error deleting address:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// PATCH set default address
router.patch("/:id/default", authenticateToken, async (req, res) => {
  try {
    const customer_id = req.user.id;
    const addressId = req.params.id;

    // Find the address and ensure it belongs to the customer
    const address = await Address.findOne({
      _id: addressId,
      customer_id
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        error: "Address not found"
      });
    }

    // Unset all defaults for this customer
    await Address.updateMany(
      { customer_id },
      { $set: { is_default: false } }
    );

    // Set this address as default
    address.is_default = true;
    address.updated_at = new Date();
    await address.save();

    res.json({
      success: true,
      message: "Default address updated successfully",
      data: address
    });
  } catch (err) {
    console.error('Error setting default address:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
