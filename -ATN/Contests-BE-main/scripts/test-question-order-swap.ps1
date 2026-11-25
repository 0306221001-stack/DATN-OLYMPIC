# Test script for Question Order Swapping functionality
# This script tests the enhanced updateQuestionDetail API that handles order conflicts by swapping

$baseUrl = "http://localhost:3000/api/v1"
$jwtToken = "YOUR_JWT_TOKEN_HERE"  # Replace with actual JWT token

$headers = @{
    "Authorization" = "Bearer $jwtToken"
    "Content-Type" = "application/json"
}

Write-Host "🧪 Testing Question Order Swapping Functionality" -ForegroundColor Cyan
Write-Host "=" * 60

# Test scenario: Two questions with orders 1 and 2, try to change question 1 to order 2
$questionId1 = 1
$questionId2 = 2
$questionPackageId = 1

Write-Host "`n📋 Test Scenario: Order Swapping" -ForegroundColor Yellow
Write-Host "- Question $questionId1 currently has order 1"
Write-Host "- Question $questionId2 currently has order 2"
Write-Host "- We'll try to change Question $questionId1 to order 2"
Write-Host "- Expected: Orders should be swapped automatically"

# Step 1: Get initial state of both questions
Write-Host "`n🔍 Step 1: Getting initial state of questions" -ForegroundColor Green

try {
    $question1Response = Invoke-RestMethod -Uri "$baseUrl/question-details/$questionId1/$questionPackageId" -Method GET -Headers $headers
    $question2Response = Invoke-RestMethod -Uri "$baseUrl/question-details/$questionId2/$questionPackageId" -Method GET -Headers $headers
    
    Write-Host "✅ Question $questionId1 current order: $($question1Response.data.questionOrder)"
    Write-Host "✅ Question $questionId2 current order: $($question2Response.data.questionOrder)"
    
    $originalOrder1 = $question1Response.data.questionOrder
    $originalOrder2 = $question2Response.data.questionOrder
}
catch {
    Write-Host "❌ Failed to get initial question states: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Try to update question 1 to have the same order as question 2
Write-Host "`n🔄 Step 2: Updating Question $questionId1 to order $originalOrder2 (should trigger swap)" -ForegroundColor Green

$updateBody = @{
    questionOrder = $originalOrder2
} | ConvertTo-Json

try {
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/question-details/$questionId1/$questionPackageId" -Method PUT -Headers $headers -Body $updateBody
    
    Write-Host "✅ Update successful!" -ForegroundColor Green
    Write-Host "📝 Response message: $($updateResponse.message)"
    
    if ($updateResponse.data.swappedWith) {
        Write-Host "🔄 Order swapped with Question ID: $($updateResponse.data.swappedWith.questionId)" -ForegroundColor Cyan
        Write-Host "   - Old order: $($updateResponse.data.swappedWith.oldOrder)"
        Write-Host "   - New order: $($updateResponse.data.swappedWith.newOrder)"
    } else {
        Write-Host "ℹ️  No swap occurred (normal update)" -ForegroundColor Blue
    }
}
catch {
    $errorResponse = $_.Exception.Response
    if ($errorResponse) {
        $reader = New-Object System.IO.StreamReader($errorResponse.GetResponseStream())
        $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
        Write-Host "❌ Update failed: $($errorBody.message)" -ForegroundColor Red
        Write-Host "🔍 Error details: $($errorBody.error.details)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Update failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    exit 1
}

# Step 3: Verify the final state
Write-Host "`n🔍 Step 3: Verifying final state after update" -ForegroundColor Green

try {
    Start-Sleep -Seconds 1  # Small delay to ensure consistency
    
    $finalQuestion1Response = Invoke-RestMethod -Uri "$baseUrl/question-details/$questionId1/$questionPackageId" -Method GET -Headers $headers
    $finalQuestion2Response = Invoke-RestMethod -Uri "$baseUrl/question-details/$questionId2/$questionPackageId" -Method GET -Headers $headers
    
    $finalOrder1 = $finalQuestion1Response.data.questionOrder
    $finalOrder2 = $finalQuestion2Response.data.questionOrder
    
    Write-Host "📊 Final state:"
    Write-Host "   Question $questionId1 order: $originalOrder1 → $finalOrder1"
    Write-Host "   Question $questionId2 order: $originalOrder2 → $finalOrder2"
    
    # Verify the swap occurred correctly
    if ($finalOrder1 -eq $originalOrder2 -and $finalOrder2 -eq $originalOrder1) {
        Write-Host "✅ SUCCESS: Orders were swapped correctly!" -ForegroundColor Green
    } elseif ($finalOrder1 -eq $originalOrder2 -and $finalOrder2 -eq $originalOrder2) {
        Write-Host "ℹ️  NORMAL UPDATE: Order updated without conflict" -ForegroundColor Blue
    } else {
        Write-Host "⚠️  UNEXPECTED: Final state doesn't match expected result" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ Failed to verify final state: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n" + "=" * 60
Write-Host "🏁 Test completed!" -ForegroundColor Cyan

# Additional test: Try updating to a non-conflicting order
Write-Host "`n📋 Additional Test: Non-conflicting order update" -ForegroundColor Yellow

$nonConflictingOrder = 99
$updateBody2 = @{
    questionOrder = $nonConflictingOrder
} | ConvertTo-Json

Write-Host "🔄 Updating Question $questionId1 to order $nonConflictingOrder (should be normal update)"

try {
    $updateResponse2 = Invoke-RestMethod -Uri "$baseUrl/question-details/$questionId1/$questionPackageId" -Method PUT -Headers $headers -Body $updateBody2
    
    Write-Host "✅ Update successful!" -ForegroundColor Green
    Write-Host "📝 Response message: $($updateResponse2.message)"
    
    if ($updateResponse2.data.swappedWith) {
        Write-Host "🔄 Unexpected swap occurred" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Normal update as expected (no swap)" -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Non-conflicting update failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Test Summary:" -ForegroundColor Cyan
Write-Host "- Conflicting order update: Tests automatic order swapping"
Write-Host "- Non-conflicting order update: Tests normal update behavior"
Write-Host "- Response structure: Includes swappedWith information"
Write-Host "`nNote: Replace YOUR_JWT_TOKEN_HERE with a valid JWT token to run this test"
