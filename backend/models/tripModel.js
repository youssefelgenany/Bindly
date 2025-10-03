const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
    name: {type: String, required: true},
    location: {type: String, required: true},
    price: {type: Number, required: true},
    startDate: {type: Date, required: true},
    endDate: {type: Date, required: true},
    description:{type: String},
    capacity: {type: Number, required: true},
    registrationDeadline: {type: Date, required: true}
});

module.exports = mongoose.model('Trip', tripSchema);
