// models/Property.ts
import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User.schema';

export interface IProperty extends Document {
  _id: mongoose.Types.ObjectId;
  id: string; // from CSV
  title: string;
  type: string;
  price: number;
  state: string;
  city: string;
  areaSqFt: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string;
  furnished: string;
  availableFrom: string;
  listedBy: string;
  tags: string;
  colorTheme: string;
  rating: number;
  isVerified: boolean;
  listingType: string;
  // New fields for assignment requirements
  createdBy: mongoose.Types.ObjectId; // reference to User
  createdAt: Date;
  updatedAt: Date;
}

const propertySchema = new Schema<IProperty>({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  state: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  areaSqFt: {
    type: Number,
    required: true,
    min: 0
  },
  bedrooms: {
    type: Number,
    required: true,
    min: 0
  },
  bathrooms: {
    type: Number,
    required: true,
    min: 0
  },
  amenities: {
    type: String,
    required: true
  },
  furnished: {
    type: String,
    required: true
  },
  availableFrom: {
    type: String,
    required: true
  },
  listedBy: {
    type: String,
    required: true
  },
  tags: {
    type: String,
    required: true
  },
  colorTheme: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 5
  },
  isVerified: {
    type: Boolean,
    required: true,
    default: false
  },
  listingType: {
    type: String,
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for search optimization
propertySchema.index({ createdBy: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ state: 1, city: 1 });
propertySchema.index({ type: 1 });
propertySchema.index({ bedrooms: 1, bathrooms: 1 });

export const Property = mongoose.model<IProperty>('Property', propertySchema);