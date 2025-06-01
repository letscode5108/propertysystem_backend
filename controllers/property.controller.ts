// controllers/property.controller.ts
import { Request, Response } from 'express';
import { Property, IProperty } from '../models/Property.Schema';
import { IUser } from '../models/User.schema';
import mongoose from 'mongoose';
import { redis, CACHE_CONFIG, generateCacheKey } from '../config/redis';

interface AuthRequest extends Request {
  user?: IUser;
}

interface PropertyQuery {
  state?: string;
  city?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnished?: string;
  listingType?: string;
  minAreaSqFt?: number;
  maxAreaSqFt?: number;
  amenities?: string;
  tags?: string;
  minRating?: number;
  maxRating?: number;
  isVerified?: boolean;
  availableFrom?: string;
  availableFromStart?: string;
  availableFromEnd?: string;
  listedBy?: string;
  colorTheme?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Cache helper functions
const invalidatePropertyCaches = async (propertyId?: string, userId?: string) => {
  try {
    const keysToDelete = [
      'properties:list:*',
      'properties:count:*',
    ];
    
    if (propertyId) {
      keysToDelete.push(CACHE_CONFIG.KEYS.SINGLE_PROPERTY(propertyId));
    }
    
    if (userId) {
      keysToDelete.push(`${CACHE_CONFIG.KEYS.USER_PROPERTIES(userId)}:*`);
    }

    // Delete cache keys with pattern matching
    for (const pattern of keysToDelete) {
      if (pattern.includes('*')) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } else {
        await redis.del(pattern);
      }
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
};

// Create a new property
export const createProperty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const propertyData = {
      ...req.body,
      createdBy: req.user._id
    };

    // Validate required fields
    const requiredFields = [
      'id', 'title', 'type', 'price', 'state', 'city', 'areaSqFt',
      'bedrooms', 'bathrooms', 'amenities', 'furnished', 'availableFrom',
      'listedBy', 'tags', 'colorTheme', 'rating', 'listingType'
    ];

    const missingFields = requiredFields.filter(field => !propertyData[field]);
    if (missingFields.length > 0) {
      res.status(400).json({
        error: 'Missing required fields',
        missingFields
      });
      return;
    }

    // Validate data types and ranges
    if (typeof propertyData.price !== 'number' || propertyData.price < 0) {
      res.status(400).json({ error: 'Price must be a positive number' });
      return;
    }

    if (typeof propertyData.areaSqFt !== 'number' || propertyData.areaSqFt < 0) {
      res.status(400).json({ error: 'Area must be a positive number' });
      return;
    }

    if (typeof propertyData.rating !== 'number' || propertyData.rating < 0 || propertyData.rating > 5) {
      res.status(400).json({ error: 'Rating must be between 0 and 5' });
      return;
    }

    const property = new Property(propertyData);
    const savedProperty = await property.save();

    // Invalidate relevant caches
    await invalidatePropertyCaches(savedProperty._id.toString(), req.user._id.toString());

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: savedProperty
    });
  } catch (error: any) {
    console.error('Create property error:', error);
    
    if (error.code === 11000) {
      res.status(400).json({ error: 'Property with this ID already exists' });
      return;
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all properties with comprehensive filtering, sorting, and pagination
export const getProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      state,
      city,
      type,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      furnished,
      listingType,
      minAreaSqFt,
      maxAreaSqFt,
      amenities,
      tags,
      minRating,
      maxRating,
      isVerified,
      availableFrom,
      availableFromStart,
      availableFromEnd,
      listedBy,
      colorTheme,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    }: PropertyQuery = req.query;

    // Generate cache key based on query parameters
    const queryParams = {
      state, city, type, minPrice, maxPrice, bedrooms, bathrooms,
      furnished, listingType, minAreaSqFt, maxAreaSqFt, amenities,
      tags, minRating, maxRating, isVerified, availableFrom,
      availableFromStart, availableFromEnd, listedBy, colorTheme,
      page, limit, sortBy, sortOrder
    };
    
    const cacheKey = generateCacheKey(CACHE_CONFIG.KEYS.PROPERTIES_LIST, queryParams);

    // Try to get from cache first
    try {
      const cachedResult = await redis.get(cacheKey);
      if (cachedResult) {
        res.status(200).json({
          ...cachedResult,
          fromCache: true
        });
        return;
      }
    } catch (cacheError) {
      console.error('Cache read error:', cacheError);
    }

    // Build filter object
    const filter: any = {};

    // Text-based filters (case-insensitive regex)
    if (state) filter.state = new RegExp(state, 'i');
    if (city) filter.city = new RegExp(city, 'i');
    if (type) filter.type = new RegExp(type, 'i');
    if (furnished) filter.furnished = new RegExp(furnished, 'i');
    if (listingType) filter.listingType = new RegExp(listingType, 'i');
    if (listedBy) filter.listedBy = new RegExp(listedBy, 'i');
    if (colorTheme) filter.colorTheme = new RegExp(colorTheme, 'i');

    // Amenities search (supports partial matches)
    if (amenities) {
      filter.amenities = new RegExp(amenities, 'i');
    }

    // Tags search (supports partial matches)
    if (tags) {
      filter.tags = new RegExp(tags, 'i');
    }

    // Exact number filters
    if (bedrooms) filter.bedrooms = parseInt(bedrooms.toString());
    if (bathrooms) filter.bathrooms = parseInt(bathrooms.toString());

    // Boolean filter
    if (isVerified !== undefined) {
      filter.isVerified = String(isVerified).toLowerCase() === 'true';
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice.toString());
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice.toString());
    }

    // Area range filter
    if (minAreaSqFt || maxAreaSqFt) {
      filter.areaSqFt = {};
      if (minAreaSqFt) filter.areaSqFt.$gte = parseFloat(minAreaSqFt.toString());
      if (maxAreaSqFt) filter.areaSqFt.$lte = parseFloat(maxAreaSqFt.toString());
    }

    // Rating range filter
    if (minRating || maxRating) {
      filter.rating = {};
      if (minRating) filter.rating.$gte = parseFloat(minRating.toString());
      if (maxRating) filter.rating.$lte = parseFloat(maxRating.toString());
    }

    // Available from date filters
    if (availableFrom) {
      filter.availableFrom = availableFrom;
    } else if (availableFromStart || availableFromEnd) {
      filter.availableFrom = {};
      if (availableFromStart) filter.availableFrom.$gte = availableFromStart;
      if (availableFromEnd) filter.availableFrom.$lte = availableFromEnd;
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page.toString()));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit.toString())));
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sortOptions: any = {};
    const validSortFields = [
      'createdAt', 'updatedAt', 'price', 'areaSqFt', 'rating', 
      'bedrooms', 'bathrooms', 'title', 'state', 'city'
    ];
    
    if (validSortFields.includes(sortBy)) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions['createdAt'] = -1;
    }

    // Execute query
    const [properties, totalCount] = await Promise.all([
      Property.find(filter)
        .populate('createdBy', 'name email role')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Property.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    const result = {
      success: true,
      data: properties,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      appliedFilters: {
        ...filter,
        sortBy,
        sortOrder
      }
    };

    // Cache the result
    try {
      await redis.setex(cacheKey, CACHE_CONFIG.TTL.PROPERTIES_LIST, JSON.stringify(result));
    } catch (cacheError) {
      console.error('Cache write error:', cacheError);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get a single property by ID
export const getPropertyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid property ID format' });
      return;
    }

    const cacheKey = CACHE_CONFIG.KEYS.SINGLE_PROPERTY(id);

    // Try to get from cache
    try {
      const cachedProperty = await redis.get(cacheKey);
      if (cachedProperty) {
        res.status(200).json({
          success: true,
          data: cachedProperty,
          fromCache: true
        });
        return;
      }
    } catch (cacheError) {
      console.error('Cache read error:', cacheError);
    }

    const property = await Property.findById(id).populate('createdBy', 'name email role');

    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    // Cache the property
    try {
      await redis.setex(cacheKey, CACHE_CONFIG.TTL.SINGLE_PROPERTY, JSON.stringify(property));
    } catch (cacheError) {
      console.error('Cache write error:', cacheError);
    }

    res.status(200).json({
      success: true,
      data: property
    });
  } catch (error) {
    console.error('Get property by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get properties created by the authenticated user
export const getMyProperties = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    }: PropertyQuery = req.query;

    const queryParams = { page, limit, sortBy, sortOrder };
    const cacheKey = generateCacheKey(CACHE_CONFIG.KEYS.USER_PROPERTIES(req.user._id.toString()), queryParams);

    // Try to get from cache
    try {
      const cachedResult = await redis.get(cacheKey);
      if (cachedResult) {
        res.status(200).json({
          ...cachedResult,
          fromCache: true
        });
        return;
      }
    } catch (cacheError) {
      console.error('Cache read error:', cacheError);
    }

    const pageNum = Math.max(1, parseInt(page.toString()));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit.toString())));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [properties, totalCount] = await Promise.all([
      Property.find({ createdBy: req.user._id })
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Property.countDocuments({ createdBy: req.user._id })
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    const result = {
      success: true,
      data: properties,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    };

    // Cache the result
    try {
      await redis.setex(cacheKey, CACHE_CONFIG.TTL.USER_PROPERTIES, JSON.stringify(result));
    } catch (cacheError) {
      console.error('Cache write error:', cacheError);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Get my properties error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a property (only by creator)
export const updateProperty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid property ID format' });
      return;
    }

    // Find the property
    const property = await Property.findById(id);

    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    // Check if the user is the creator
    if (!property.createdBy.equals(req.user._id)) {
      res.status(403).json({ error: 'You can only update properties you created' });
      return;
    }

    // Remove fields that shouldn't be updated
    const updateData = { ...req.body };
    delete updateData.createdBy;
    delete updateData.createdAt;
    delete updateData._id;

    // Validate numeric fields if provided
    if (updateData.price !== undefined) {
      if (typeof updateData.price !== 'number' || updateData.price < 0) {
        res.status(400).json({ error: 'Price must be a positive number' });
        return;
      }
    }

    if (updateData.areaSqFt !== undefined) {
      if (typeof updateData.areaSqFt !== 'number' || updateData.areaSqFt < 0) {
        res.status(400).json({ error: 'Area must be a positive number' });
        return;
      }
    }

    if (updateData.rating !== undefined) {
      if (typeof updateData.rating !== 'number' || updateData.rating < 0 || updateData.rating > 5) {
        res.status(400).json({ error: 'Rating must be between 0 and 5' });
        return;
      }
    }

    // Update the property
    const updatedProperty = await Property.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email role');

    // Invalidate relevant caches
    await invalidatePropertyCaches(id, req.user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Property updated successfully',
      data: updatedProperty
    });
  } catch (error: any) {
    console.error('Update property error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a property (only by creator)
export const deleteProperty = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid property ID format' });
      return;
    }

    // Find the property
    const property = await Property.findById(id);

    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    // Check if the user is the creator
    if (!property.createdBy.equals(req.user._id)) {
      res.status(403).json({ error: 'You can only delete properties you created' });
      return;
    }

    // Delete the property
    await Property.findByIdAndDelete(id);

    // Invalidate relevant caches
    await invalidatePropertyCaches(id, req.user._id.toString());

    res.status(200).json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk delete properties (only by creator)
export const bulkDeleteProperties = async (req: AuthRequest, res: Response): Promise<void> => {
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

    // Validate all IDs
    const invalidIds = propertyIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      res.status(400).json({ 
        error: 'Invalid property ID format',
        invalidIds
      });
      return;
    }

    // Find properties and check ownership
    const properties = await Property.find({
      _id: { $in: propertyIds },
      createdBy: req.user._id
    });

    if (properties.length !== propertyIds.length) {
      res.status(403).json({ 
        error: 'You can only delete properties you created or some properties were not found'
      });
      return;
    }

    // Delete properties
    const result = await Property.deleteMany({
      _id: { $in: propertyIds },
      createdBy: req.user._id
    });

    // Invalidate caches for all deleted properties
    for (const propertyId of propertyIds) {
      await invalidatePropertyCaches(propertyId, req.user._id.toString());
    }

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} properties deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Bulk delete properties error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};