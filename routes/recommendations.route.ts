// routes/recommendations.ts
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  createRecommendation,
  getReceivedRecommendations,
  getSentRecommendations,
  updateRecommendationStatus,
  searchUserByEmail
} from '../controllers/recommendation.controller';

const router = express.Router();


router.use(authenticateToken);
router.get('/search-user', searchUserByEmail);
router.post('/', createRecommendation);
router.get('/received', getReceivedRecommendations)
router.get('/sent', getSentRecommendations);
router.patch('/:id/status', updateRecommendationStatus);

export default router;