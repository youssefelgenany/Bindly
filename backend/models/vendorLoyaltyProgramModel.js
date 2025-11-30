const mongoose = require('mongoose');

const vendorLoyaltyProgramSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional for backwards compatibility with existing records
      index: true
    },
    vendorName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    discountRate: { type: Number, required: true, min: 0 },
    discountType: {
      type: String,
      enum: ['percentage', 'amount'],
      default: 'percentage'
    },
    promoCode: { type: String, required: true, trim: true },
    termsAndConditions: { type: String, required: true, trim: true },
    validFrom: { type: Date },
    validUntil: { type: Date },
    isActive: { type: Boolean, default: true },
    logoUrl: { type: String, trim: true }
  },
  {
    timestamps: true
  }
);

// Index on vendor ID to ensure one application per vendor
vendorLoyaltyProgramSchema.index(
  { vendor: 1 },
  { unique: true }
);

// Keep vendorName index for backwards compatibility and searching
vendorLoyaltyProgramSchema.index(
  { vendorName: 1 },
  { collation: { locale: 'en', strength: 2 } }
);

module.exports = mongoose.model(
  'VendorLoyaltyProgram',
  vendorLoyaltyProgramSchema
);

