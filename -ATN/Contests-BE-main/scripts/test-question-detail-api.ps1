# Question Detail API Testing Script
# This script tests all the main endpoints of the Question Detail API

$baseUrl = "http://localhost:3000/api/question-details"

Write-Host "=== Question Detail API Testing Script ===" -ForegroundColor Green
Write-Host "Base URL: $baseUrl" -ForegroundColor Yellow
Write-Host ""

# Test 1: Get all question details with pagination
Write-Host "1. Testing: Get Question Details List (Paginated)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl?page=1&limit=5" -Method GET -ContentType "application/json"
    Write-Host "✅ SUCCESS: Found $($response.pagination.total) total records" -ForegroundColor Green
    Write-Host "   Page: $($response.pagination.page)/$($response.pagination.totalPages)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Get statistics
Write-Host "2. Testing: Get Statistics" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/stats" -Method GET -ContentType "application/json"
    Write-Host "✅ SUCCESS: Total question details: $($response.data.totalQuestionDetails)" -ForegroundColor Green
    Write-Host "   Active: $($response.data.activeQuestionDetails)" -ForegroundColor Gray
    Write-Host "   Unique Questions: $($response.data.uniqueQuestions)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Get questions by package ID
Write-Host "3. Testing: Get Questions by Package ID" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/package/1" -Method GET -ContentType "application/json"
    Write-Host "✅ SUCCESS: Found $($response.data.Count) questions in package 1" -ForegroundColor Green
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Get packages by question ID  
Write-Host "4. Testing: Get Packages by Question ID" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/question/7" -Method GET -ContentType "application/json"
    Write-Host "✅ SUCCESS: Question 7 is in $($response.data.Count) packages" -ForegroundColor Green
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Get specific question detail by composite key
Write-Host "5. Testing: Get Question Detail by Composite Key" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/7/1" -Method GET -ContentType "application/json"
    Write-Host "✅ SUCCESS: Found question detail (Q:7, P:1)" -ForegroundColor Green
    Write-Host "   Order: $($response.data.questionOrder), Active: $($response.data.isActive)" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Test validation with invalid data
Write-Host "6. Testing: Validation (Invalid Data)" -ForegroundColor Cyan
try {
    $body = @{
        questionId = -1
        questionPackageId = 1
        questionOrder = 1
        isActive = $true
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl" -Method POST -Body $body -ContentType "application/json"
    Write-Host "❌ UNEXPECTED: Should have failed validation" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ SUCCESS: Validation correctly rejected invalid data" -ForegroundColor Green
    } else {
        Write-Host "❌ FAILED: Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 7: Test business logic (duplicate detection)
Write-Host "7. Testing: Business Logic (Duplicate Detection)" -ForegroundColor Cyan
try {
    $body = @{
        questionId = 7
        questionPackageId = 1
        questionOrder = 999
        isActive = $true
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl" -Method POST -Body $body -ContentType "application/json"
    Write-Host "❌ UNEXPECTED: Should have detected duplicate" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "✅ SUCCESS: Business logic correctly detected duplicate" -ForegroundColor Green
    } else {
        Write-Host "❌ FAILED: Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 8: Test filtering
Write-Host "8. Testing: Filtering (Active Records Only)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl?isActive=true&limit=3" -Method GET -ContentType "application/json"
    Write-Host "✅ SUCCESS: Filtered active records" -ForegroundColor Green
    Write-Host "   Found: $($response.data.Count) active records" -ForegroundColor Gray
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Testing Complete ===" -ForegroundColor Green
Write-Host "All core functionality has been tested!" -ForegroundColor Yellow
