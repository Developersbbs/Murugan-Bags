const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customers',
    required: true
  },
  type: {
    type: String,
    enum: ['Home', 'Work', 'Other'],
    required: true
  },
  // Structured address fields for detailed checkout information
  firstName: {
    type: String,
    required: false  // Made optional for backward compatibility
  },
  lastName: {
    type: String,
    required: false  // Made optional for backward compatibility
  },
  email: {
    type: String,
    required: false  // Made optional for backward compatibility
  },
  phone: {
    type: String,
    required: false  // Made optional for backward compatibility
  },
  street: {
    type: String,
    required: false  // Made optional for backward compatibility
  },
  city: {
    type: String,
    required: false  // Made optional for backward compatibility
  },
  state: {
    type: String,
    required: false  // Made optional for backward compatibility
  },
  zipCode: {
    type: String,
    required: false  // Made optional for backward compatibility
  },
  country: {
    type: String,
    default: 'USA'
  },
  // Legacy field for backward compatibility
  address: {
    type: String,
    // Make this optional since we're moving to structured fields
  },
  is_default: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Ensure only one default address per customer
addressSchema.pre('save', async function(next) {
  try {
    if (this.is_default && mongoose.connection.readyState === 1) {
      // Remove default flag from other addresses for this customer
      await mongoose.connection.collection('addresses').updateMany(
        { customer_id: this.customer_id, _id: { $ne: this._id } },
        { $set: { is_default: false } }
      );
    }

    // For backward compatibility, populate legacy address field if not set
    if (!this.address && this.street && this.city && this.state && this.zipCode) {
      this.address = `${this.street}, ${this.city}, ${this.state} ${this.zipCode}, ${this.country}`;
    }

    next();
  } catch (error) {
    console.error('Error in address pre-save hook:', error);
    next(error);
  }
});

const Address = mongoose.model("Address", addressSchema);

module.exports = Address;
