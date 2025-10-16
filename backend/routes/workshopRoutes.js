const express = require('express');
const router = express.Router();
const { protect, permit } = require('../middleware/authMiddleware');
const {
  getAllWorkshops,
  getMyWorkshops,
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
  approveWorkshop,
  rejectWorkshop,
  requestEdits
} = require('../controllers/workshopController');

// Professor routes (require professor-id header)
router.get('/my-workshops', getMyWorkshops);
// routes/workshopRoutes.js
router.post('/', protect, permit('Professor'), createWorkshop);

router.put('/:id', updateWorkshop);
router.delete('/:id', deleteWorkshop);

// Events Office routes (no professor-id needed)
router.get('/', getAllWorkshops);
router.put('/:id/approve', approveWorkshop);
router.put('/:id/reject', rejectWorkshop);
router.put('/:id/request-edits', requestEdits);

module.exports = router;