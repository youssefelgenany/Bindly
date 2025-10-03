const express = require('express');
const router = express.Router();
const { createBazaar, editBazaar } = require('../controllers/bazaarController');

router.post('/', createBazaar);
router.put('/:id', editBazaar);

module.exports = router;
