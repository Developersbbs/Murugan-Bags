const mongoose = require("mongoose");

const staffRoleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  display_name: { type: String, required: true },
  is_default: { type: Boolean, default: false },
});

module.exports = mongoose.model("staffroles", staffRoleSchema);
