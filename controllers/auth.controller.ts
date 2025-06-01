// controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { User, IUser } from '../models/User.schema';

// Environment variables (make sure to set these)
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

interface AuthRequest extends Request {
  user?: IUser;
}

// Generate JWT tokens
const generateTokens = (userId: string) => {
  const payload = { userId };
  const accessToken = jwt.sign(payload, JWT_SECRET as Secret, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET as string, { expiresIn: JWT_REFRESH_EXPIRES_IN }as SignOptions);
  return { accessToken, refreshToken };
};

// Register user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role } = req.body;

    // Validation
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name are required' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: 'User already exists with this email' });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      role: role || 'owner'
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
   let { refreshToken } = req.body;
    
    if (!refreshToken) {
      const authHeader = req.headers['authorization'];
      refreshToken = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    }

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token is required' });
      return;
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET as string) as { userId: string };
    
    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    // Generate new tokens
    const tokens = generateTokens(user._id.toString());

    res.json({
      message: 'Token refreshed successfully',
      ...tokens
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// Get user profile
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};