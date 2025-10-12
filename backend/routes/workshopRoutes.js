const express = require('express');
const router = express.Router();
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
router.post('/', createWorkshop);
router.put('/:id', updateWorkshop);
router.delete('/:id', deleteWorkshop);

// Events Office routes (no professor-id needed)
router.get('/', getAllWorkshops);
router.put('/:id/approve', approveWorkshop);
router.put('/:id/reject', rejectWorkshop);
router.put('/:id/request-edits', requestEdits);

module.exports = router;