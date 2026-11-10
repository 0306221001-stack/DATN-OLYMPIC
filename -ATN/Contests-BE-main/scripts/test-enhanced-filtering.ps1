#!/usr/bin/env pwsh
# Test script for enhanced Question Detail API filtering

Write-Host "=== Enhanced Question Detail API Filter Testing ===" -ForegroundColor Green
Write-Host "Testing the enhanced 'Get Questions by Package' API with new filtering capabilities" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000/api/question-details"
$packageId = 1  # Adjust this to a valid package ID in your system

Write-Host "Base URL: $baseUrl" -ForegroundColor Yellow
Write-Host "Package ID for testing: $packageId" -ForegroundColor Yellow
Write-Host ""

# Test 1: Basic request without filters
Write-Host "=== Test 1: Basic request (no filters) ===" -ForegroundColor Blue
$response1 = Invoke-RestMethod -Uri "$baseUrl/package/$packageId" -Method GET
Write-Host "Status: Success" -ForegroundColor Green
Write-Host "Total questions: $($response1.filters.totalQuestions)" -ForegroundColor Yellow
Write-Host "Filtered questions: $($response1.filters.filteredQuestions)" -ForegroundColor Yellow
Write-Host "Applied filters: $($response1.filters.appliedFilters | ConvertTo-Json -Compress)" -ForegroundColor Yellow
Write-Host ""

# Test 2: Filter by question type
Write-Host "=== Test 2: Filter by question type (multiple_choice) ===" -ForegroundColor Blue
try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/package/$packageId?questionType=multiple_choice" -Method GET
    Write-Host "Status: Success" -ForegroundColor Green
    Write-Host "Total questions: $($response2.filters.totalQuestions)" -ForegroundColor Yellow
    Write-Host "Filtered questions: $($response2.filters.filteredQuestions)" -ForegroundColor Yellow
    Write-Host "Applied filters: $($response2.filters.appliedFilters | ConvertTo-Json -Compress)" -ForegroundColor Yellow
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Filter by difficulty
Write-Host "=== Test 3: Filter by difficulty (Alpha) ===" -ForegroundColor Blue
try {
    $response3 = Invoke-RestMethod -Uri "$baseUrl/package/$packageId?difficulty=Alpha" -Method GET
    Write-Host "Status: Success" -ForegroundColor Green
    Write-Host "Total questions: $($response3.filters.totalQuestions)" -ForegroundColor Yellow
    Write-Host "Filtered questions: $($response3.filters.filteredQuestions)" -ForegroundColor Yellow
    Write-Host "Applied filters: $($response3.filters.appliedFilters | ConvertTo-Json -Compress)" -ForegroundColor Yellow
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Filter by status (active only)
Write-Host "=== Test 4: Filter by status (active only) ===" -ForegroundColor Blue
try {
    $response4 = Invoke-RestMethod -Uri "$baseUrl/package/$packageId?isActive=true" -Method GET
    Write-Host "Status: Success" -ForegroundColor Green
    Write-Host "Total questions: $($response4.filters.totalQuestions)" -ForegroundColor Yellow
    Write-Host "Filtered questions: $($response4.filters.filteredQuestions)" -ForegroundColor Yellow
    Write-Host "Applied filters: $($response4.filters.appliedFilters | ConvertTo-Json -Compress)" -ForegroundColor Yellow
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Combined filters
Write-Host "=== Test 5: Combined filters (multiple_choice + Alpha + active) ===" -ForegroundColor Blue
try {
    $response5 = Invoke-RestMethod -Uri "$baseUrl/package/$packageId?questionType=multiple_choice&difficulty=Alpha&isActive=true" -Method GET
    Write-Host "Status: Success" -ForegroundColor Green
    Write-Host "Total questions: $($response5.filters.totalQuestions)" -ForegroundColor Yellow
    Write-Host "Filtered questions: $($response5.filters.filteredQuestions)" -ForegroundColor Yellow
    Write-Host "Applied filters: $($response5.filters.appliedFilters | ConvertTo-Json -Compress)" -ForegroundColor Yellow
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Search with filters
Write-Host "=== Test 6: Search with filters ===" -ForegroundColor Blue
try {
    $response6 = Invoke-RestMethod -Uri "$baseUrl/package/$packageId?search=test&questionType=multiple_choice" -Method GET
    Write-Host "Status: Success" -ForegroundColor Green
    Write-Host "Total questions: $($response6.filters.totalQuestions)" -ForegroundColor Yellow
    Write-Host "Filtered questions: $($response6.filters.filteredQuestions)" -ForegroundColor Yellow
    Write-Host "Applied filters: $($response6.filters.appliedFilters | ConvertTo-Json -Compress)" -ForegroundColor Yellow
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: Sorting by new fields
Write-Host "=== Test 7: Sort by difficulty ===" -ForegroundColor Blue
try {
    $response7 = Invoke-RestMethod -Uri "$baseUrl/package/$packageId?sortBy=difficulty&sortOrder=desc" -Method GET
    Write-Host "Status: Success" -ForegroundColor Green
    Write-Host "Total questions: $($response7.filters.totalQuestions)" -ForegroundColor Yellow
    Write-Host "First question difficulty: $($response7.data.questions[0].question.difficulty)" -ForegroundColor Yellow
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 8: Sort by question type
Write-Host "=== Test 8: Sort by question type ===" -ForegroundColor Blue
try {
    $response8 = Invoke-RestMethod -Uri "$baseUrl/package/$packageId?sortBy=questionType&sortOrder=asc" -Method GET
    Write-Host "Status: Success" -ForegroundColor Green
    Write-Host "Total questions: $($response8.filters.totalQuestions)" -ForegroundColor Yellow
    Write-Host "First question type: $($response8.data.questions[0].question.questionType)" -ForegroundColor Yellow
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 9: Invalid filter values
Write-Host "=== Test 9: Invalid filter values ===" -ForegroundColor Blue
try {
    $response9 = Invoke-RestMethod -Uri "$baseUrl/package/$packageId?questionType=invalid_type" -Method GET
    Write-Host "Status: Unexpected success (should have failed)" -ForegroundColor Red
} catch {
    Write-Host "Status: Expected validation error" -ForegroundColor Green
    Write-Host "Error message: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# Test 10: Pagination with filters
Write-Host "=== Test 10: Pagination with filters ===" -ForegroundColor Blue
try {
    $response10 = Invoke-RestMethod -Uri "$baseUrl/package/$packageId?page=1&limit=5&questionType=multiple_choice" -Method GET
    Write-Host "Status: Success" -ForegroundColor Green
    Write-Host "Page: $($response10.pagination.page)" -ForegroundColor Yellow
    Write-Host "Limit: $($response10.pagination.limit)" -ForegroundColor Yellow
    Write-Host "Total: $($response10.pagination.total)" -ForegroundColor Yellow
    Write-Host "Has Next: $($response10.pagination.hasNext)" -ForegroundColor Yellow
    Write-Host "Applied filters: $($response10.filters.appliedFilters | ConvertTo-Json -Compress)" -ForegroundColor Yellow
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Testing Complete ===" -ForegroundColor Green
Write-Host "All enhanced filtering capabilities have been tested!" -ForegroundColor Cyan
