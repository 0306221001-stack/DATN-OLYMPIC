# Contest Backend API

A robust Node.js TypeScript backend application for a contest platform, built with Express.js, Prisma ORM, and PostgreSQL.

## 🚀 Features

- **Modern Tech Stack**: Node.js, TypeScript, Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: Zod schema validation
- **Security**: Helmet, CORS, bcrypt password hashing
- **Logging**: Winston logger with file and console output
- **Error Handling**: Centralized error handling with custom error codes
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Testing**: Comprehensive test suite
- **Development**: Hot reload with nodemon

## 📋 Prerequisites

- Node.js (v18 or later)
- PostgreSQL database
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd contest-BE
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/contest_db?schema=public"
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:3000
   LOG_LEVEL=info
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run prisma:generate
   
   # Run database migrations
   npm run prisma:migrate
   ```

## 🚦 Usage

### Development
```bash
# Start development server with hot reload
npm run dev

# Start development server with watch mode
npm run dev:watch
```

### Production
```bash
# Build the application
npm run build

# Start production server
npm start
```

### API Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: `http://localhost:3000/api/v1/docs`
- **API Specification**: `http://localhost:3000/api/v1/docs.json`
- **API Info**: `http://localhost:3000/api/v1`
- **Health Check**: `http://localhost:3000/health`

The Swagger UI provides:
- 🎯 **Interactive testing** of all API endpoints
- 🔐 **JWT authentication** support
- 📋 **Complete request/response documentation**
- ✅ **Real-time validation** and examples

### Database Management
```bash
# Generate Prisma client
npm run prisma:generate

# Create and apply a new migration
npm run prisma:migrate

# Deploy migrations to production
npm run prisma:deploy

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Seed database with sample data
npm run prisma:seed

# Undo/Delete all seed data (with confirmation)
npm run prisma:undo-seed

# Undo/Delete all seed data (force, no confirmation)
npm run prisma:undo-seed-force

# Advanced undo with selective table deletion
npm run prisma:undo-seed-advanced
```

### Testing
```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📁 Project Structure

```
contest-BE/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── modules/            # Feature modules
│   │   └── user/           # User module
│   │       ├── user.controller.ts
│   │       ├── user.service.ts
│   │       ├── user.schema.ts
│   │       └── user.routes.ts
│   ├── config/             # Configuration files
│   │   └── database.ts     # Database configuration
│   ├── middlewares/        # Express middlewares
│   │   └── errorHandler.ts # Error handling middleware
│   ├── utils/              # Utility functions
│   │   ├── logger.ts       # Winston logger setup
│   │   └── validation.ts   # Validation helpers
│   ├── constants/          # Application constants
│   │   └── errorCodes.ts   # Error codes and messages
│   ├── tests/              # Test files
│   │   └── user.test.ts    # User module tests
│   ├── app.ts              # Express app configuration
│   └── server.ts           # Server entry point
├── logs/                   # Log files
├── .env                    # Environment variables
├── .gitignore             
├── package.json           
├── tsconfig.json          
└── README.md              
```

## 🔌 API Endpoints

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/users/register` | Register a new user |
| POST | `/api/v1/users/login` | Login user |
| GET | `/api/v1/users` | Get all users (admin) |
| GET | `/api/v1/users/:id` | Get user by ID |
| PUT | `/api/v1/users/:id` | Update user |
| DELETE | `/api/v1/users/:id` | Delete user |
| GET | `/api/v1/users/profile/me` | Get current user profile |
| PUT | `/api/v1/users/profile/me` | Update current user profile |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check endpoint |
| GET | `/api/v1` | API information |

## 📝 API Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment (development/production) | development |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | JWT expiration time | 7d |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:3000 |
| `LOG_LEVEL` | Logging level | info |

## 🧪 Testing

The project includes comprehensive tests for all modules:

- Unit tests for services
- Integration tests for API endpoints
- Database testing with test database

Run tests with:
```bash
npm test
```

## 📊 Logging

The application uses Winston for logging with the following levels:
- `error`: Error messages
- `warn`: Warning messages
- `info`: Informational messages
- `debug`: Debug messages

Logs are written to:
- Console (development)
- `logs/app.log` (all logs)
- `logs/error.log` (error logs only)

## 🛡️ Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **bcrypt**: Password hashing
- **Input validation**: Zod schema validation
- **Error handling**: Secure error responses

## 🚀 Deployment

### Docker (Optional)
```bash
# Build Docker image
docker build -t contest-be .

# Run container
docker run -p 3000:3000 contest-be
```

### Environment Setup
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Build and start the application

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support, please contact the development team or create an issue in the repository.

---

Built with ❤️ using Node.js, TypeScript, and Express.js
