# Property Management API

A comprehensive RESTful API for managing real estate properties with user authentication, favorites, and recommendation features with 200 users and 1000 properties.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Contributing](#contributing)
- [License](#license)

## Features

🏠 **Property Management**
- Create, read, update, and delete property listings
- Bulk operations for property management
- User-specific property queries

👤 **User Authentication**
- Secure registration and login
- JWT-based authentication with refresh tokens
- Protected routes and user profiles

❤️ **Favorites System**
- Save properties to favorites
- Bulk favorite management
- Favorite count tracking

🤝 **Recommendations**
- Share property recommendations between users
- Track sent and received recommendations
- User search functionality

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Authentication**: JSON Web Tokens (JWT)
- **Architecture**: RESTful API with MVC pattern

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Database (MongoDB/PostgreSQL/MySQL)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd property-management-api
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Configure the following variables in `.env`:
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
DATABASE_URL=your-database-url
```

4. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Get Profile
```http
GET /auth/profile
Authorization: Bearer <access-token>
```

### Property Endpoints

#### Get All Properties
```http
GET /properties
```

#### Get Property by ID
```http
GET /properties/:id
```

#### Create Property (Protected)
```http
POST /properties
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "title": "Beautiful House",
  "description": "A lovely 3-bedroom house",
  "price": 250000,
  "address": "123 Main St",
  "type": "house",
  "bedrooms": 3,
  "bathrooms": 2
}
```

#### Get My Properties (Protected)
```http
GET /properties/user/my-properties
Authorization: Bearer <access-token>
```

#### Update Property (Protected)
```http
PUT /properties/:id
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "title": "Updated Title",
  "price": 275000
}
```

#### Delete Property (Protected)
```http
DELETE /properties/:id
Authorization: Bearer <access-token>
```

#### Bulk Delete Properties (Protected)
```http
DELETE /properties/bulk/delete
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "propertyIds": ["id1", "id2", "id3"]
}
```

### Favorites Endpoints

#### Add to Favorites (Protected)
```http
POST /favorites
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "propertyId": "property-id"
}
```

#### Get User Favorites (Protected)
```http
GET /favorites
Authorization: Bearer <access-token>
```

#### Remove from Favorites (Protected)
```http
DELETE /favorites/:propertyId
Authorization: Bearer <access-token>
```

#### Check Favorite Status (Protected)
```http
GET /favorites/check/:propertyId
Authorization: Bearer <access-token>
```

#### Get Favorite Count
```http
GET /favorites/count/:propertyId
```

#### Bulk Remove Favorites (Protected)
```http
DELETE /favorites
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "propertyIds": ["id1", "id2", "id3"]
}
```

### Recommendation Endpoints

#### Search User by Email (Protected)
```http
GET /recommendations/search-user?email=user@example.com
Authorization: Bearer <access-token>
```

#### Create Recommendation (Protected)
```http
POST /recommendations
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "propertyId": "property-id",
  "recipientId": "user-id",
  "message": "Check out this property!"
}
```

#### Get Received Recommendations (Protected)
```http
GET /recommendations/received
Authorization: Bearer <access-token>
```

#### Get Sent Recommendations (Protected)
```http
GET /recommendations/sent
Authorization: Bearer <access-token>
```

#### Update Recommendation Status (Protected)
```http
PATCH /recommendations/:id/status
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "status": "read"
}
```

## Authentication

This API uses JWT (JSON Web Tokens) for authentication. Include the access token in the Authorization header for protected routes:

```http
Authorization: Bearer <your-access-token>
```

### Token Flow
1. Register or login to receive access and refresh tokens
2. Use access token for protected routes
3. When access token expires, use refresh token to get new tokens
4. Refresh tokens have longer expiration times

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "statusCode": 400
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server
npm run test        # Run tests
npm run lint        # Run ESLint
```

### Project Structure

```
src/
├── controllers/     # Route handlers
├── middleware/      # Custom middleware
├── models/         # Data models
├── routes/         # Route definitions
├── services/       # Business logic
├── utils/          # Utility functions
└── types/          # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request



---

**Built with ❤️ using Node.js and TypeScript**
