
import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from '../models/User.schema';
import { IProperty } from '../models/Property.Schema';

export interface IFavorite extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const favoriteSchema = new Schema<IFavorite>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyId: {
    type: Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  }
}, {
  timestamps: true
});

// Prevent duplicate favorites
favoriteSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

// Optimize queries
favoriteSchema.index({ userId: 1 });
favoriteSchema.index({ propertyId: 1 });

export const Favorite = mongoose.model<IFavorite>('Favorite', favoriteSchema);