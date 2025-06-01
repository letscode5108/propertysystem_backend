import express, { Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';



dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));





// Routes
import authRoutes from './routes/auth.route'; 
import propertyRoutes from './routes/property.route'; 
import favoriteRoutes from './routes/favorite.routes'; 
import recommendationRoutes from './routes/recommendations.route';


//Routes in use
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/properties', propertyRoutes); 
app.use('/api/v1/favorites', favoriteRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);


// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mydatabase',)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

app.get('/', (req: Request, res: Response) => {
  res.json({ status: 'Server is running!', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});