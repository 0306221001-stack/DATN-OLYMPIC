# About Module

This module provides CRUD (Create, Read, Update, Delete) operations for managing "About" information in the contest application. The About model stores institutional information such as school details, contact information, and embedded content.

## Features

- ✅ Create new about information
- ✅ Retrieve all about information with pagination and filtering
- ✅ Retrieve specific about information by ID
- ✅ Update about information
- ✅ Soft delete about information (set isActive to false)
- ✅ Restore deleted about information
- ✅ Permanently delete about information
- ✅ Input validation with Zod schemas
- ✅ Comprehensive error handling
- ✅ Logging for all operations
- ✅ Full test coverage

## Database Schema

The About model contains the following fields:

```typescript
{
  id: number;              // Auto-increment primary key
  schoolName: string;      // Required, max 255 characters
  website?: string;        // Optional URL, max 255 characters
  departmentName?: string; // Optional, max 255 characters
  email?: string;          // Optional email, max 255 characters
  fanpage?: string;        // Optional URL, max 255 characters
  mapEmbedCode?: string;   // Optional embed code for maps
  isActive: boolean;       // Default true, for soft deletes
  createdAt: DateTime;     // Auto-generated
  updatedAt: DateTime;     // Auto-generated
}
```

## API Endpoints

### Create About Information
```
POST /api/about
```
**Authentication Required**: Yes
**Body**:
```json
{
  "schoolName": "Trường Đại học Công nghệ Thông tin",
  "website": "https://uit.edu.vn",
  "departmentName": "Khoa Công nghệ Phần mềm",
  "email": "contact@uit.edu.vn",
  "fanpage": "https://facebook.com/uit.edu.vn",
  "mapEmbedCode": "<iframe src='...'></iframe>"
}
```

### Get All About Information
```
GET /api/about?page=1&limit=10&search=keyword&isActive=true
```
**Authentication Required**: No
**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `search`: Search term for schoolName, departmentName, or email
- `isActive`: Filter by active status

### Get About Information by ID
```
GET /api/about/:id
```
**Authentication Required**: No

### Update About Information
```
PUT /api/about/:id
```
**Authentication Required**: Yes
**Body**: Same as create, but all fields are optional

### Delete About Information (Soft Delete)
```
DELETE /api/about/:id
```
**Authentication Required**: Yes

### Restore About Information
```
PATCH /api/about/:id/restore
```
**Authentication Required**: Yes

### Permanently Delete About Information
```
DELETE /api/about/:id/permanent
```
**Authentication Required**: Yes

## Response Format

All endpoints return responses in the following format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ },
  "timestamp": "2025-05-31T12:00:00.000Z"
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "timestamp": "2025-05-31T12:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": { /* error details */ },
  "timestamp": "2025-05-31T12:00:00.000Z"
}
```

## Validation Rules

### Create About Information
- `schoolName`: Required, 1-255 characters
- `website`: Optional, must be valid URL, max 255 characters
- `departmentName`: Optional, max 255 characters
- `email`: Optional, must be valid email, max 255 characters
- `fanpage`: Optional, max 255 characters
- `mapEmbedCode`: Optional, no length limit

### Update About Information
- All fields are optional
- Same validation rules apply when fields are provided

## Error Codes

- `400`: Bad Request - Invalid input data
- `401`: Unauthorized - Authentication required
- `404`: Not Found - About information not found
- `500`: Internal Server Error - Server error

## Usage Examples

### Create About Information
```typescript
import { AboutService } from '@/modules/about';

const aboutData = {
  schoolName: 'Trường Đại học ABC',
  website: 'https://abc.edu.vn',
  email: 'contact@abc.edu.vn'
};

const newAbout = await AboutService.createAbout(aboutData);
```

### Get About Information with Pagination
```typescript
const query = {
  page: 1,
  limit: 10,
  search: 'Công nghệ',
  isActive: true
};

const { aboutList, pagination } = await AboutService.getAllAbout(query);
```

### Update About Information
```typescript
const updateData = {
  schoolName: 'Updated School Name',
  email: 'newemail@school.edu'
};

const updatedAbout = await AboutService.updateAbout(1, updateData);
```

## Testing

The module includes comprehensive tests covering:
- ✅ CRUD operations
- ✅ Input validation
- ✅ Authentication requirements
- ✅ Error handling
- ✅ Edge cases

Run tests with:
```bash
npm test -- --testPathPattern=about
```

## Files Structure

```
src/modules/about/
├── about.controller.ts    # Request/response handling
├── about.service.ts       # Business logic and database operations
├── about.schema.ts        # Zod validation schemas and TypeScript types
├── about.routes.ts        # Route definitions with Swagger documentation
├── about.test.ts          # Comprehensive test suite
├── index.ts               # Module exports
└── README.md              # This documentation
```

## Dependencies

- **Prisma**: Database ORM
- **Zod**: Schema validation
- **Express**: Web framework
- **Winston**: Logging
- **Jest**: Testing framework
- **Supertest**: HTTP testing

## Contributing

When modifying this module:

1. Update the schema if database changes are needed
2. Add proper validation for new fields
3. Update tests to cover new functionality
4. Add logging for new operations
5. Update this README if API changes
6. Follow the existing error handling patterns
