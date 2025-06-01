"use strict";
// import express from 'express';
// import mongoose from 'mongoose';
Object.defineProperty(exports, "__esModule", { value: true });
// import cors from 'cors';
// import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';
// import dotenv from 'dotenv';
// // Import routes
// // Load environment variables
// dotenv.config();
// const app = express();
// const PORT = process.env.PORT || 5000;
// // Connect to MongoDB
// mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/property-listings')
//   .then(() => {
//     console.log('Connected to MongoDB');
//   })
//   .catch((error) => {
//     console.error('MongoDB connection error:', error);
//     process.exit(1);
//   });
// // Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// // Middleware
// app.use(helmet());
// app.use(cors());
// app.use(limiter);
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true }));
// // Health check route
// app.get('/health', (req, res) => {
//   res.status(200).json({ 
//     status: 'OK', 
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime()
//   });
// });
// // Routes
// // Global error handler
// app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
//   console.error(err.stack);
//   res.status(err.status || 500).json({
//     message: err.message || 'Internal Server Error',
//     ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
//   });
// });
// // 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({ message: 'Route not found' });
// });
// // Start server
// const startServer = async () => {
//   try {
//     app.listen(PORT, () => {
//       console.log(`Server running on port ${PORT}`);
//       console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
//     });
//   } catch (error) {
//     console.error('Failed to start server:', error);
//     process.exit(1);
//   }
// };
// startServer();
var express_1 = require("express");
var cors_1 = require("cors");
var app = (0, express_1.default)();
var PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.get('/', function (req, res) {
    res.json({ message: 'Server is running!' });
});
app.get('/api/health', function (req, res) {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Start server
app.listen(PORT, function () {
    console.log("Server running on port ".concat(PORT));
});
