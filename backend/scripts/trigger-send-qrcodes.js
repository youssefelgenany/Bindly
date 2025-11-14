const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Ensure core models are registered with mongoose before populate
require('../models/userModel');
const VendorRequest = require('../models/vendorRequest');
const Registration = require('../models/registrationModel');
const Event = require('../models/eventModel');
const { sendQRCodesToVendor } = require('../utils/sendQRCodesToVendor');

const EVENT_ID = '6917419e2796a76f458dc70b'; // Test Bazaar for QR Codes

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const event = await Event.findById(EVENT_ID).lean();
        if (!event) {
            console.error('Event not found:', EVENT_ID);
            process.exit(1);
        }

        const vendorRequests = await VendorRequest.find({
            $or: [{ bazaar: EVENT_ID }, { booth: EVENT_ID }, { standaloneBooth: EVENT_ID }],
            status: 'accepted'
        }).populate('vendor', 'email firstName lastName companyName').lean();

        console.log('Found vendor requests:', vendorRequests.length);

        const registrations = await Registration.find({ event: EVENT_ID })
            .populate('user', 'email firstName lastName name')
            .sort({ registeredAt: -1 })
            .lean();

        console.log('Found registrations:', registrations.length);

        // Deduplicate vendors by email (lowercased) or id to avoid sending
        // multiple emails to the same vendor address when there are
        // multiple accepted vendor requests.
        const seen = new Set();
        const uniqueVendors = [];
        for (const vr of vendorRequests) {
            const v = vr.vendor;
            if (!v) continue;
            const emailKey = v.email ? String(v.email).toLowerCase().trim() : null;
            const idKey = v._id ? String(v._id) : (v.id ? String(v.id) : null);
            const key = emailKey || idKey;
            if (!key) continue;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueVendors.push(v);
            }
        }

        console.log('Unique vendors to notify:', uniqueVendors.length);
        for (const vendor of uniqueVendors) {
            console.log('Sending/storing email for vendor:', vendor?.email);
            const result = await sendQRCodesToVendor(vendor, event, registrations);
            console.log('Result:', result);
        }

        await mongoose.disconnect();
        console.log('Done.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
})();
