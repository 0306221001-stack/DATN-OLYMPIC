# Enhanced Question Detail Update API - Order Swapping

## Overview
The `updateQuestionDetail` API has been enhanced to handle question order conflicts intelligently. When updating a question's order to a value that already exists in the same package, the system will automatically swap the orders between the two questions instead of returning an error.

## API Endpoint
```
PUT /api/v1/question-details/{questionId}/{questionPackageId}
```

## Enhanced Behavior

### Previous Behavior (Before Enhancement)
- When trying to update a question's order to an existing order number
- API would return: `409 Conflict - "Thứ tự câu hỏi đã tồn tại trong gói này"`
- No update would be performed

### New Behavior (After Enhancement)
- When trying to update a question's order to an existing order number
- System automatically swaps the orders between the two questions
- Both questions are updated in a single transaction
- Returns success response with swap information

## Request Body
```json
{
  "questionOrder": 5,  // Optional: New order for the question
  "isActive": true     // Optional: Active status
}
```

## Response Formats

### Case 1: Normal Update (No Order Conflict)
```json
{
  "success": true,
  "message": "Cập nhật chi tiết câu hỏi thành công",
  "data": {
    "updatedQuestionDetail": {
      "questionId": 1,
      "questionPackageId": 1,
      "questionOrder": 10,
      "isActive": true,
      "createdAt": "2023-12-01T10:00:00.000Z",
      "updatedAt": "2023-12-01T11:00:00.000Z"
    },
    "swappedWith": null
  },
  "timestamp": "2023-12-01T11:00:00.000Z"
}
```

### Case 2: Order Swap Occurred
```json
{
  "success": true,
  "message": "Cập nhật thứ tự câu hỏi thành công. Đã hoán đổi thứ tự với câu hỏi ID 2",
  "data": {
    "updatedQuestionDetail": {
      "questionId": 1,
      "questionPackageId": 1,
      "questionOrder": 5,
      "isActive": true,
      "createdAt": "2023-12-01T10:00:00.000Z",
      "updatedAt": "2023-12-01T11:00:00.000Z"
    },
    "swappedWith": {
      "questionId": 2,
      "oldOrder": 5,
      "newOrder": 3
    }
  },
  "timestamp": "2023-12-01T11:00:00.000Z"
}
```

## Implementation Details

### Service Layer Methods

#### 1. `getQuestionDetailByOrder`
```typescript
static async getQuestionDetailByOrder(
  questionPackageId: number,
  questionOrder: number
): Promise<QuestionDetail | null>
```
- Finds a question detail by its order in a specific package
- Only considers active question details

#### 2. `swapQuestionOrder`
```typescript
static async swapQuestionOrder(
  questionPackageId: number,
  questionId1: number,
  questionId2: number
): Promise<{ updatedQuestion1: QuestionDetail; updatedQuestion2: QuestionDetail }>
```
- Swaps the order values between two questions in the same package
- Uses database transaction to ensure atomicity
- Returns both updated question details

### Controller Logic Flow

1. **Check for Order Conflict**: When `questionOrder` is provided in the request
2. **Find Existing Question**: Look for another question with the same order
3. **Determine Action**: 
   - If no conflict: Proceed with normal update
   - If conflict exists: Perform order swap
4. **Execute Update**: Either normal update or swap operation
5. **Return Response**: Include swap information if applicable

## Error Handling

### Validation Errors
- **400 Bad Request**: Invalid question ID or package ID
- **400 Bad Request**: Invalid request body format

### Business Logic Errors
- **404 Not Found**: Question detail relationship doesn't exist
- **500 Internal Server Error**: Database transaction failed

## Usage Examples

### Example 1: Simple Order Update
```bash
curl -X PUT "http://localhost:3000/api/v1/question-details/1/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"questionOrder": 10}'
```

### Example 2: Order Update That Triggers Swap
```bash
# Assuming Question 2 already has order 5
curl -X PUT "http://localhost:3000/api/v1/question-details/1/1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"questionOrder": 5}'
```

## Client Integration Guidelines

### Handling the Response
```javascript
async function updateQuestionDetail(questionId, packageId, updateData) {
  try {
    const response = await fetch(`/api/v1/question-details/${questionId}/${packageId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      if (result.data.swappedWith) {
        // Order was swapped with another question
        console.log(`Order swapped with question ${result.data.swappedWith.questionId}`);
        // Update UI to reflect both question changes
        updateQuestionInUI(result.data.updatedQuestionDetail);
        updateQuestionOrderInUI(
          result.data.swappedWith.questionId, 
          result.data.swappedWith.newOrder
        );
      } else {
        // Normal update
        console.log('Question updated successfully');
        updateQuestionInUI(result.data.updatedQuestionDetail);
      }
    }
  } catch (error) {
    console.error('Update failed:', error);
  }
}
```

### UI/UX Considerations

1. **User Notification**: When a swap occurs, inform the user that orders were automatically swapped
2. **Visual Feedback**: Update the display of both affected questions in the UI
3. **Confirmation Dialog**: Consider showing a confirmation before triggering swaps for better UX
4. **Real-time Updates**: If using real-time features, broadcast the swap to all connected clients

## Benefits

1. **Improved User Experience**: No more order conflict errors
2. **Intuitive Behavior**: Matches user expectations for drag-and-drop interfaces
3. **Data Integrity**: Maintains unique order constraints
4. **Atomic Operations**: All changes happen in a single transaction
5. **Detailed Feedback**: Clear information about what changes occurred

## Database Transaction Safety

The swap operation uses Prisma transactions to ensure:
- Both updates succeed or both fail
- No intermediate state where orders are duplicated
- Rollback capability if any step fails
- ACID compliance for the operation

## Testing Scenarios

1. **Normal Update**: Update to non-conflicting order
2. **Order Swap**: Update to existing order (triggers swap)
3. **Self-Update**: Try to update to same current order (no change)
4. **Invalid Data**: Test with invalid question IDs or package IDs
5. **Concurrent Updates**: Test behavior under concurrent modification
6. **Transaction Rollback**: Test failure scenarios and rollback behavior

## Migration Notes

- **Backward Compatibility**: Existing API consumers continue to work
- **Response Format**: New `swappedWith` field added (null for normal updates)
- **Message Enhancement**: More descriptive success messages
- **No Breaking Changes**: All existing integrations remain functional
