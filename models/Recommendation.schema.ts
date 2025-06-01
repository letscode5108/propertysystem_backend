// models/Recommendation.schema.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IRecommendation extends Document {
  _id: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  property: mongoose.Types.ObjectId;
  message?: string;
  status: 'pending' | 'read' | 'archived';
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  markAsRead(): Promise<IRecommendation>;
  archive(): Promise<IRecommendation>;
}

export interface IRecommendationModel extends Model<IRecommendation> {
  checkDuplicate(
    senderId: mongoose.Types.ObjectId,
    recipientId: mongoose.Types.ObjectId,
    propertyId: mongoose.Types.ObjectId
  ): Promise<IRecommendation | null>;
  findReceivedByUser(
    userId: mongoose.Types.ObjectId,
    status?: string
  ): Promise<IRecommendation[]>;
  findSentByUser(
    userId: mongoose.Types.ObjectId
  ): Promise<IRecommendation[]>;
}

const recommendationSchema = new Schema<IRecommendation>({
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  property: {
    type: Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  message: {
    type: String,
    maxlength: 500,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'read', 'archived'],
    default: 'pending',
    required: true
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for performance optimization
recommendationSchema.index({ recipient: 1, createdAt: -1 });
recommendationSchema.index({ sender: 1, createdAt: -1 });
recommendationSchema.index({ recipient: 1, status: 1 });
recommendationSchema.index({ sender: 1, recipient: 1, property: 1 }, { unique: true });

// Virtual populate for easier querying
recommendationSchema.virtual('senderInfo', {
  ref: 'User',
  localField: 'sender',
  foreignField: '_id',
  justOne: true
});

recommendationSchema.virtual('recipientInfo', {
  ref: 'User',
  localField: 'recipient',
  foreignField: '_id',
  justOne: true
});

recommendationSchema.virtual('propertyInfo', {
  ref: 'Property',
  localField: 'property',
  foreignField: '_id',
  justOne: true
});

// Middleware to update readAt when status changes to 'read'
recommendationSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'read' && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

// Static methods for common queries
recommendationSchema.statics.findReceivedByUser = function(userId: mongoose.Types.ObjectId, status?: string) {
  const query: any = { recipient: userId };
  if (status) {
    query.status = status;
  }
  
  return this.find(query)
    .populate('sender', 'name email')
    .populate('property', 'title type price city state areaSqFt bedrooms bathrooms')
    .sort({ createdAt: -1 });
};

recommendationSchema.statics.findSentByUser = function(userId: mongoose.Types.ObjectId) {
  return this.find({ sender: userId })
    .populate('recipient', 'name email')
    .populate('property', 'title type price city state areaSqFt bedrooms bathrooms')
    .sort({ createdAt: -1 });
};

recommendationSchema.statics.checkDuplicate = function(
  senderId: mongoose.Types.ObjectId, 
  recipientId: mongoose.Types.ObjectId, 
  propertyId: mongoose.Types.ObjectId
) {
  return this.findOne({
    sender: senderId,
    recipient: recipientId,
    property: propertyId
  });
};

// Instance methods
recommendationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

recommendationSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

export const Recommendation = mongoose.model<IRecommendation, IRecommendationModel>('Recommendation', recommendationSchema);