const express = require('express');
const router = express.Router();
const { createTrip, editTrip } = require('../controllers/tripController');

router.post('/', createTrip);
router.put('/:id', editTrip);

module.exports = router;
