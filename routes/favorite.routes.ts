// routes/favorite.routes.ts
import express from 'express';
import {
  addToFavorites,
  getFavorites,
  removeFromFavorites,
  checkFavoriteStatus,
  getFavoriteCount,
  bulkRemoveFromFavorites
} from '../controllers/favorite.controller';
import { authenticateToken } from '../middleware/auth.middleware'; 

const router = express.Router();


router.post('/', authenticateToken, addToFavorites);
router.get('/', authenticateToken, getFavorites);
router.delete('/:propertyId', authenticateToken, removeFromFavorites);
router.get('/check/:propertyId', authenticateToken, checkFavoriteStatus);
router.get('/count/:propertyId', getFavoriteCount);
router.delete('/', authenticateToken, bulkRemoveFromFavorites);

export default router;