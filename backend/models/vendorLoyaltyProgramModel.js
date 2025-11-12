const mongoose = require('mongoose');

const vendorLoyaltyProgramSchema = new mongoose.Schema(
  {
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

vendorLoyaltyProgramSchema.index(
  { vendorName: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = mongoose.model(
  'VendorLoyaltyProgram',
  vendorLoyaltyProgramSchema
);

