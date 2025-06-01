// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User.schema';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'secret-key';

interface AuthRequest extends Request {
  user?: IUser;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ error: 'Access token is required' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET as string) as { userId: string };
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};