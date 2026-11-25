# Manual Testing Guide for Enhanced Filtering

## Authentication Required

The Question Detail API requires authentication. To test the enhanced filtering:

1. **Get Authentication Token**
   ```bash
   POST /api/auth/login
   Content-Type: application/json
   
   {
     "email": "your-email@example.com",
     "password": "your-password"
   }
   ```

2. **Use Token in Requests**
   ```bash
   GET /api/question-details/package/1?questionType=multiple_choice
   Authorization: Bearer YOUR_TOKEN_HERE
   ```

## Test Cases

### 1. Basic Filtering Tests

#### Filter by Question Type
```bash
# Multiple choice questions
GET /api/question-details/package/1?questionType=multiple_choice

# Essay questions
GET /api/question-details/package/1?questionType=essay
```

#### Filter by Difficulty
```bash
# Alpha level questions
GET /api/question-details/package/1?difficulty=Alpha

# Beta level questions
GET /api/question-details/package/1?difficulty=Beta

# Rc level questions
GET /api/question-details/package/1?difficulty=Rc

# Gold level questions
GET /api/question-details/package/1?difficulty=Gold
```

#### Filter by Status
```bash
# Active questions only
GET /api/question-details/package/1?isActive=true

# Inactive questions only
GET /api/question-details/package/1?isActive=false
```

### 2. Combined Filter Tests

```bash
# Multiple choice + Alpha difficulty
GET /api/question-details/package/1?questionType=multiple_choice&difficulty=Alpha

# Active + Essay + Beta difficulty
GET /api/question-details/package/1?questionType=essay&difficulty=Beta&isActive=true

# Search + Filters
GET /api/question-details/package/1?search=math&questionType=multiple_choice&difficulty=Alpha
```

### 3. Sorting Tests

```bash
# Sort by difficulty (descending)
GET /api/question-details/package/1?sortBy=difficulty&sortOrder=desc

# Sort by question type (ascending)
GET /api/question-details/package/1?sortBy=questionType&sortOrder=asc

# Sort by difficulty with filters
GET /api/question-details/package/1?questionType=multiple_choice&sortBy=difficulty&sortOrder=desc
```

### 4. Pagination Tests

```bash
# Page 2 with filters
GET /api/question-details/package/1?questionType=multiple_choice&page=2&limit=5

# Small page size with multiple filters
GET /api/question-details/package/1?questionType=essay&difficulty=Gold&page=1&limit=3
```

### 5. Validation Tests

```bash
# Invalid question type (should return 400)
GET /api/question-details/package/1?questionType=invalid_type

# Invalid difficulty (should return 400)
GET /api/question-details/package/1?difficulty=InvalidDifficulty

# Invalid boolean (should return 400)
GET /api/question-details/package/1?isActive=invalid_boolean
```

## Expected Response Structure

All successful responses should include the new `filters` section:

```json
{
  "success": true,
  "message": "Lấy danh sách câu hỏi theo gói thành công",
  "data": {
    "packageInfo": {
      "id": 1,
      "name": "Package Name"
    },
    "questions": [
      {
        "questionId": 1,
        "questionPackageId": 1,
        "questionOrder": 1,
        "isActive": true,
        "createdAt": "2025-06-10T10:00:00.000Z",
        "updatedAt": "2025-06-10T10:00:00.000Z",
        "question": {
          "id": 1,          "plainText": "Question text",
          "questionType": "multiple_choice",
          "difficulty": "Alpha"
        },
        "questionPackage": {
          "id": 1,
          "name": "Package Name"
        }
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "totalQuestions": 50,
    "filteredQuestions": 15,    "appliedFilters": {
      "questionType": "multiple_choice",
      "difficulty": "Alpha",
      "isActive": true
    }
  },
  "timestamp": "2025-06-10T10:00:00.000Z"
}
```

## Key Points to Verify

1. **Filter Statistics**: Check `filters.totalQuestions` vs `filters.filteredQuestions`
2. **Applied Filters**: Verify `filters.appliedFilters` matches request parameters  
3. **Pagination**: Ensure `pagination.total` uses filtered count, not total count
4. **Sorting**: Verify questions are sorted correctly by the specified field
5. **Combinations**: Test that multiple filters work together (AND logic)
6. **Validation**: Confirm invalid values return proper error messages

## Performance Notes

- Filters are applied at the database level for efficiency
- Filter statistics require separate count queries but are optimized
- Large result sets should still paginate efficiently
- Sorting by question properties uses nested queries appropriately
