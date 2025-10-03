const mongoose = require('mongoose');

const bazaarSchema = new mongoose.Schema({
    name: {type: String, required: true},
    location: {type: String, required: true},
    startDate: {type: Date, required: true},
    endDate: {type: Date, required: true},
    description:{type: String},
    registrationDeadline: {type: Date, required: true}
});

module.exports = mongoose.model('Bazaar', bazaarSchema);

