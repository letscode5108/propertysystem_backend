import { Request, Response } from 'express';
import { Favorite, IFavorite } from '../models/Favorite.schema';
import { Property } from '../models/Property.Schema';
import { IUser } from '../models/User.schema';
import mongoose from 'mongoose';

interface AuthRequest extends Request {
  user?: IUser;
}

// Add property to favorites
export const addToFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { propertyId } = req.body;

    if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId)) {
      res.status(400).json({ error: 'Valid property ID is required' });
      return;
    }

    // Check if property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    // Check if already favorited
    const existingFavorite = await Favorite.findOne({
      userId: req.user._id,
      propertyId
    });

    if (existingFavorite) {
      res.status(400).json({ error: 'Property already in favorites' });
      return;
    }

    const favorite = new Favorite({
      userId: req.user._id,
      propertyId
    });

    await favorite.save();

    res.status(201).json({
      success: true,
      message: 'Property added to favorites',
      data: favorite
    });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's favorite properties
export const getFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const pageNum = Math.max(1, parseInt(page.toString()));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit.toString())));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions: any = {};
    sortOptions[sortBy.toString()] = sortOrder === 'asc' ? 1 : -1;

    const [favorites, totalCount] = await Promise.all([
      Favorite.find({ userId: req.user._id })
        .populate('propertyId')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Favorite.countDocuments({ userId: req.user._id })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      data: favorites,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Remove property from favorites
export const removeFromFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { propertyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      res.status(400).json({ error: 'Invalid property ID format' });
      return;
    }

    const favorite = await Favorite.findOneAndDelete({
      userId: req.user._id,
      propertyId
    });

    if (!favorite) {
      res.status(404).json({ error: 'Favorite not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Property removed from favorites'
    });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if property is favorited by user
export const checkFavoriteStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { propertyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      res.status(400).json({ error: 'Invalid property ID format' });
      return;
    }

    const favorite = await Favorite.findOne({
      userId: req.user._id,
      propertyId
    });

    res.status(200).json({
      success: true,
      isFavorited: !!favorite,
      favoriteId: favorite?._id || null
    });
  } catch (error) {
    console.error('Check favorite status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get favorite count for a property
export const getFavoriteCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      res.status(400).json({ error: 'Invalid property ID format' });
      return;
    }

    const count = await Favorite.countDocuments({ propertyId });

    res.status(200).json({
      success: true,
      propertyId,
      favoriteCount: count
    });
  } catch (error) {
    console.error('Get favorite count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk remove favorites
export const bulkRemoveFromFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { propertyIds } = req.body;

    if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
      res.status(400).json({ error: 'Property IDs array is required' });
      return;
    }

    const invalidIds = propertyIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      res.status(400).json({ 
        error: 'Invalid property ID format',
        invalidIds
      });
      return;
    }

    const result = await Favorite.deleteMany({
      userId: req.user._id,
      propertyId: { $in: propertyIds }
    });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} properties removed from favorites`,
      removedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Bulk remove from favorites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};