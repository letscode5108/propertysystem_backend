// routes/property.routes.ts
import express from 'express';
import {
  createProperty,
  getProperties,
  getPropertyById,
  getMyProperties,
  updateProperty,
  deleteProperty,
  bulkDeleteProperties
} from '../controllers/property.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

// Public routes (no authentication required)
router.get('/', getProperties);                    // GET /api/properties
router.get('/:id', getPropertyById);               // GET /api/properties/:id

// Protected routes (authentication required)
router.use(authenticateToken); // Apply authentication middleware to all routes below

router.post('/', createProperty);                  // POST /api/properties
router.get('/user/my-properties', getMyProperties); // GET /api/properties/user/my-properties
router.put('/:id', updateProperty);               // PUT /api/properties/:id
router.delete('/:id', deleteProperty);            // DELETE /api/properties/:id
router.delete('/bulk/delete', bulkDeleteProperties); // DELETE /api/properties/bulk/delete

export default router;