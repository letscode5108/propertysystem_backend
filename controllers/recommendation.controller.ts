// controllers/recommendation.controller.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Recommendation } from '../models/Recommendation.schema';
import { User, IUser } from '../models/User.schema';
import { Property } from '../models/Property.Schema';

interface AuthRequest extends Request {
  user?: IUser;
}

// Search for user by email (for finding recipients)
export const searchUserByEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Find user by email (exact match)
    const user = await User.findOne(
      { email: email.toLowerCase().trim() },
      'name email role' // Only return safe fields
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Don't allow recommending to yourself
    if (user._id.toString() === req.user?._id.toString()) {
      res.status(400).json({ error: 'Cannot recommend to yourself' });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Search user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new recommendation
export const createRecommendation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { recipientId, propertyId, message } = req.body;
    const senderId = req.user?._id;

    // Validate required fields
    if (!recipientId || !propertyId) {
      res.status(400).json({ error: 'Recipient ID and Property ID are required' });
      return;
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(recipientId) || !mongoose.Types.ObjectId.isValid(propertyId)) {
      res.status(400).json({ error: 'Invalid recipient or property ID' });
      return;
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      res.status(404).json({ error: 'Recipient not found' });
      return;
    }

    // Check if property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    // Check for duplicate recommendation
    const existingRecommendation = await Recommendation.checkDuplicate(
      senderId!,
      new mongoose.Types.ObjectId(recipientId),
      new mongoose.Types.ObjectId(propertyId)
    );

    if (existingRecommendation) {
      res.status(409).json({ error: 'You have already recommended this property to this user' });
      return;
    }

    // Create recommendation
    const recommendation = new Recommendation({
      sender: senderId,
      recipient: recipientId,
      property: propertyId,
      message: message?.trim() || undefined
    });

    await recommendation.save();

    // Populate the recommendation with user and property details
    await recommendation.populate([
      { path: 'sender', select: 'name email' },
      { path: 'recipient', select: 'name email' },
      { path: 'property', select: 'title type price city state areaSqFt bedrooms bathrooms' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Recommendation sent successfully',
      recommendation
    });
  } catch (error) {
    console.error('Create recommendation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get recommendations received by current user
export const getReceivedRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { status, page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = { recipient: userId };
    if (status && ['pending', 'read', 'archived'].includes(status as string)) {
      query.status = status;
    }

    // Get recommendations with pagination
    const recommendations = await Recommendation.find(query)
      .populate('sender', 'name email')
      .populate('property', 'title type price city state areaSqFt bedrooms bathrooms colorTheme rating')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const totalCount = await Recommendation.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limitNum);

    // Get status counts
    const statusCounts = await Recommendation.aggregate([
      { $match: { recipient: userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const counts = {
      pending: 0,
      read: 0,
      archived: 0,
      total: totalCount
    };

    statusCounts.forEach(item => {
      counts[item._id as keyof typeof counts] = item.count;
    });

    res.status(200).json({
      success: true,
      recommendations,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      statusCounts: counts
    });
  } catch (error) {
    console.error('Get received recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get recommendations sent by current user
export const getSentRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const recommendations = await Recommendation.find({ sender: userId })
      .populate('recipient', 'name email')
      .populate('property', 'title type price city state areaSqFt bedrooms bathrooms')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalCount = await Recommendation.countDocuments({ sender: userId });
    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      recommendations,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Get sent recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update recommendation status
export const updateRecommendationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?._id;

    // Validate status
    if (!status || !['read', 'archived'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Must be "read" or "archived"' });
      return;
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid recommendation ID' });
      return;
    }

    // Find recommendation and ensure user is the recipient
    const recommendation = await Recommendation.findOne({
      _id: id,
      recipient: userId
    });

    if (!recommendation) {
      res.status(404).json({ error: 'Recommendation not found or access denied' });
      return;
    }

    // Update status
    recommendation.status = status;
    if (status === 'read' && !recommendation.readAt) {
      recommendation.readAt = new Date();
    }

    await recommendation.save();

    res.status(200).json({
      success: true,
      message: `Recommendation marked as ${status}`,
      recommendation: {
        _id: recommendation._id,
        status: recommendation.status,
        readAt: recommendation.readAt
      }
    });
  } catch (error) {
    console.error('Update recommendation status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};