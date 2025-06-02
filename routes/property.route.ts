
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

// Public routes 
router.get('/', getProperties);                    
router.get('/:id', getPropertyById);              

// Protected routes 
router.use(authenticateToken); 

router.post('/', createProperty);                 
router.get('/user/my-properties', getMyProperties); 
router.put('/:id', updateProperty);               
router.delete('/:id', deleteProperty);            
router.delete('/bulk/delete', bulkDeleteProperties); 

export default router;
