/**
 * Calculate vendor participation fee based on request details
 * Pricing rules:
 * - For BOOTH: Based on duration (weeks) and location
 * - For BAZAAR: Based on location and booth size (2x2 or 4x4)
 * 
 * @param {Object} request - The vendor request object (may need to be populated with event data)
 * @returns {Number} The calculated participation fee in EGP
 */
function calculateVendorParticipationFee(request) {
    let fee = 0;
    const eventType = request.eventType;

    // Location pricing multipliers (premium locations cost more)
    const locationMultipliers = {
        'sports-area': 1.2,      // 20% premium
        'parking': 1.0,          // Base price
        'main-gate': 1.5,        // 50% premium (high traffic)
        'main-entrance': 1.5,    // 50% premium (high traffic)
        'platform': 1.1,         // 10% premium
        'exam-halls': 0.9        // 10% discount (lower traffic)
    };

    // Base prices
    const baseBoothPricePerWeek = 1000; // EGP per week for booth
    const baseBazaarPrice2x2 = 2000;     // EGP for 2x2 booth in bazaar
    const baseBazaarPrice4x4 = 3500;     // EGP for 4x4 booth in bazaar

    if (eventType === 'booth' || eventType === 'standaloneBooth' || eventType === 'platformBooth') {
        // BOOTH PRICING: Based on duration and location
        const durationWeeks = request.durationWeeks || 1;
        const location = request.boothLocation || 'parking';
        const locationMultiplier = locationMultipliers[location] || 1.0;

        // Calculate: base price per week * duration * location multiplier
        fee = baseBoothPricePerWeek * durationWeeks * locationMultiplier;

        console.log(`💰 Booth fee calculation:`, {
            durationWeeks,
            location,
            locationMultiplier,
            basePrice: baseBoothPricePerWeek,
            calculatedFee: fee
        });

    } else if (eventType === 'bazaar') {
        // BAZAAR PRICING: Based on location and booth size
        const boothSize = request.boothSize || '2x2';
        
        // Get location from bazaar event if available, otherwise use default
        let location = 'parking'; // Default location
        if (request.bazaar && typeof request.bazaar === 'object' && request.bazaar.location) {
            location = request.bazaar.location;
        } else if (request.bazaar && typeof request.bazaar === 'string') {
            // If bazaar is just an ID, we'll need to fetch it (handled in controller)
            location = 'parking'; // Default until populated
        }
        
        // Normalize location to match our multipliers (handle variations)
        const normalizedLocation = location.toLowerCase().replace(/\s+/g, '-');
        const locationMultiplier = locationMultipliers[normalizedLocation] || 
                                   locationMultipliers[location] || 1.0;

        // Base price depends on booth size
        const basePrice = boothSize === '4x4' ? baseBazaarPrice4x4 : baseBazaarPrice2x2;
        
        // Calculate: base price * location multiplier
        fee = basePrice * locationMultiplier;

        console.log(`💰 Bazaar fee calculation:`, {
            boothSize,
            location,
            normalizedLocation,
            locationMultiplier,
            basePrice,
            calculatedFee: fee
        });
    } else {
        // Default fallback for unknown event types
        fee = 2000;
        console.warn(`⚠️ Unknown event type "${eventType}", using default fee: ${fee} EGP`);
    }

    // Round to nearest integer
    fee = Math.round(fee);

    // Ensure minimum fee
    const minimumFee = 500;
    fee = Math.max(fee, minimumFee);

    return fee;
}

module.exports = {
    calculateVendorParticipationFee
};
