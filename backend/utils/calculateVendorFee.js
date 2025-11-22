/**
 * Calculate vendor participation fee based on request details
 * @param {Object} request - The vendor request object
 * @returns {Number} The calculated participation fee in EGP
 */
function calculateVendorParticipationFee(request) {
    // Base fee for vendor participation
    let baseFee = 500; // Base participation fee in EGP

    // Add fees based on booth size or event type
    if (request.boothSize) {
        switch (request.boothSize.toLowerCase()) {
            case 'small':
                baseFee += 200;
                break;
            case 'medium':
                baseFee += 400;
                break;
            case 'large':
                baseFee += 600;
                break;
            default:
                baseFee += 300; // Default additional fee
        }
    }

    // Add percentage-based fee if revenue sharing (e.g., 5% of expected revenue)
    if (request.expectedRevenue && request.revenueSharePercentage) {
        const revenueFee = (request.expectedRevenue * request.revenueSharePercentage) / 100;
        baseFee += revenueFee;
    }

    // Apply discount if applicable (e.g., returning vendor)
    if (request.isReturningVendor && request.discountPercentage) {
        const discount = (baseFee * request.discountPercentage) / 100;
        baseFee -= discount;
    }

    // Ensure fee is at least the minimum (base fee)
    return Math.max(baseFee, 500);
}

module.exports = {
    calculateVendorParticipationFee
};
