# Test Question Order Normalization
# This script tests the automatic reordering functionality

$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer YOUR_JWT_TOKEN"  # Replace with actual token
}

Write-Host "=== Question Order Normalization Tests ===" -ForegroundColor Green

# Test 1: Create some questions with gaps in order
Write-Host "`n1. Creating question details with intentional gaps..." -ForegroundColor Yellow

$questionDetails = @(
    @{ questionId = 1; questionPackageId = 1; questionOrder = 1 },
    @{ questionId = 2; questionPackageId = 1; questionOrder = 3 },  # Gap at 2
    @{ questionId = 3; questionPackageId = 1; questionOrder = 5 },  # Gap at 4
    @{ questionId = 4; questionPackageId = 1; questionOrder = 7 }   # Gap at 6
)

foreach ($detail in $questionDetails) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/question-details" -Method POST -Headers $headers -Body ($detail | ConvertTo-Json)
        Write-Host "Created question detail: Question $($detail.questionId) at order $($detail.questionOrder)" -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to create question detail: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 2: Check current order before normalization
Write-Host "`n2. Checking questions before normalization..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/question-details/package/1?sortBy=questionOrder&sortOrder=asc" -Method GET -Headers $headers
    Write-Host "Questions before normalization:" -ForegroundColor Cyan
    foreach ($question in $response.data.questions) {
        Write-Host "  Question $($question.questionId): Order $($question.questionOrder)"
    }
}
catch {
    Write-Host "Failed to get questions: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Delete middle question (should trigger automatic reordering)
Write-Host "`n3. Deleting question at order 3 (Question 2)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/question-details/2/1" -Method DELETE -Headers $headers
    Write-Host "Successfully deleted question 2" -ForegroundColor Green
}
catch {
    Write-Host "Failed to delete question: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Check order after deletion
Write-Host "`n4. Checking questions after deletion..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/question-details/package/1?sortBy=questionOrder&sortOrder=asc" -Method GET -Headers $headers
    Write-Host "Questions after deletion (should show automatic reordering):" -ForegroundColor Cyan
    foreach ($question in $response.data.questions) {
        Write-Host "  Question $($question.questionId): Order $($question.questionOrder)"
    }
}
catch {
    Write-Host "Failed to get questions: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Manual normalization
Write-Host "`n5. Testing manual normalization..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/question-details/package/1/normalize-orders" -Method PUT -Headers $headers
    Write-Host "Manual normalization completed successfully" -ForegroundColor Green
}
catch {
    Write-Host "Failed to normalize orders: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Check final order
Write-Host "`n6. Checking final order after normalization..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/question-details/package/1?sortBy=questionOrder&sortOrder=asc" -Method GET -Headers $headers
    Write-Host "Questions after manual normalization:" -ForegroundColor Cyan
    foreach ($question in $response.data.questions) {
        Write-Host "  Question $($question.questionId): Order $($question.questionOrder)"
    }
}
catch {
    Write-Host "Failed to get questions: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Test question order update with automatic shifting
Write-Host "`n7. Testing question order update with automatic shifting..." -ForegroundColor Yellow
try {
    $updateData = @{ questionOrder = 2 }
    $response = Invoke-RestMethod -Uri "$baseUrl/api/question-details/4/1" -Method PUT -Headers $headers -Body ($updateData | ConvertTo-Json)
    Write-Host "Successfully updated question 4 to order 2" -ForegroundColor Green
}
catch {
    Write-Host "Failed to update question order: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Check final result
Write-Host "`n8. Checking final result after order update..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/question-details/package/1?sortBy=questionOrder&sortOrder=asc" -Method GET -Headers $headers
    Write-Host "Final order (should show automatic shifting):" -ForegroundColor Cyan
    foreach ($question in $response.data.questions) {
        Write-Host "  Question $($question.questionId): Order $($question.questionOrder)"
    }
}
catch {
    Write-Host "Failed to get questions: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Test completed ===" -ForegroundColor Green
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "- Created questions with gaps in order"
Write-Host "- Tested automatic reordering after deletion"
Write-Host "- Tested manual normalization endpoint"
Write-Host "- Tested automatic shifting when updating order"
Write-Host "`nNote: Replace YOUR_JWT_TOKEN with actual token before running" -ForegroundColor Red
