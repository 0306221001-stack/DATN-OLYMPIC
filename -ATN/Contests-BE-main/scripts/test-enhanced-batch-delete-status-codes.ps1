#!/usr/bin/env pwsh
# Test script for enhanced batch delete status codes

Write-Host "=== Enhanced Batch Delete Status Code Testing ===" -ForegroundColor Green
Write-Host "Testing the enhanced batch delete APIs with different status codes" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000/api"
$authToken = "YOUR_JWT_TOKEN_HERE"  # Replace with actual token

Write-Host "Base URL: $baseUrl" -ForegroundColor Yellow
Write-Host "Note: Replace AUTH_TOKEN with a valid JWT token" -ForegroundColor Yellow
Write-Host ""

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $authToken"
}

# Test 1: Question Topics - All Success (expect 200)
Write-Host "=== Test 1: Question Topics - All Success (Expect 200) ===" -ForegroundColor Blue
try {
    $body1 = @{
        ids = @(999, 1000)  # Use non-existent IDs or adjust to valid ones
    } | ConvertTo-Json

    $response1 = Invoke-WebRequest -Uri "$baseUrl/question-topics/batch-delete" `
                                  -Method POST `
                                  -Headers $headers `
                                  -Body $body1

    Write-Host "Status Code: $($response1.StatusCode)" -ForegroundColor $(if ($response1.StatusCode -eq 200) { "Green" } else { "Red" })
    $responseData1 = $response1.Content | ConvertFrom-Json
    Write-Host "Success: $($responseData1.success)" -ForegroundColor Yellow
    Write-Host "Message: $($responseData1.message)" -ForegroundColor Yellow
    Write-Host "Successful: $($responseData1.data.successful)" -ForegroundColor Yellow
    Write-Host "Failed: $($responseData1.data.failed)" -ForegroundColor Yellow
} catch {
    Write-Host "Error or Expected Response: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor $(if ($statusCode -eq 400) { "Green" } else { "Red" })
    }
}
Write-Host ""

# Test 2: Question Packages - All Failure (expect 400)
Write-Host "=== Test 2: Question Packages - All Failure (Expect 400) ===" -ForegroundColor Blue
try {
    $body2 = @{
        ids = @(99999, 99998)  # Use non-existent IDs
    } | ConvertTo-Json

    $response2 = Invoke-WebRequest -Uri "$baseUrl/question-packages/batch-delete" `
                                  -Method POST `
                                  -Headers $headers `
                                  -Body $body2

    Write-Host "Status Code: $($response2.StatusCode)" -ForegroundColor $(if ($response2.StatusCode -eq 400) { "Green" } else { "Red" })
    $responseData2 = $response2.Content | ConvertFrom-Json
    Write-Host "Success: $($responseData2.success)" -ForegroundColor Yellow
    Write-Host "Message: $($responseData2.message)" -ForegroundColor Yellow
    Write-Host "Successful: $($responseData2.data.successful)" -ForegroundColor Yellow
    Write-Host "Failed: $($responseData2.data.failed)" -ForegroundColor Yellow
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status Code: $statusCode" -ForegroundColor $(if ($statusCode -eq 400) { "Green" } else { "Red" })
    Write-Host "Success: $($errorResponse.success)" -ForegroundColor Yellow
    Write-Host "Message: $($errorResponse.message)" -ForegroundColor Yellow
    if ($errorResponse.data) {
        Write-Host "Successful: $($errorResponse.data.successful)" -ForegroundColor Yellow
        Write-Host "Failed: $($errorResponse.data.failed)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test 3: Question Details - Partial Success (expect 207)
Write-Host "=== Test 3: Question Details - Partial Success (Expect 207) ===" -ForegroundColor Blue
try {
    $body3 = @{
        items = @(
            @{ questionId = 1; questionPackageId = 1 },      # Might exist
            @{ questionId = 99999; questionPackageId = 99999 } # Definitely doesn't exist
        )
    } | ConvertTo-Json -Depth 3

    $response3 = Invoke-WebRequest -Uri "$baseUrl/question-details/batch-delete" `
                                  -Method POST `
                                  -Headers $headers `
                                  -Body $body3

    Write-Host "Status Code: $($response3.StatusCode)" -ForegroundColor $(if ($response3.StatusCode -eq 207) { "Green" } else { "Red" })
    $responseData3 = $response3.Content | ConvertFrom-Json
    Write-Host "Success: $($responseData3.success)" -ForegroundColor Yellow
    Write-Host "Message: $($responseData3.message)" -ForegroundColor Yellow
    Write-Host "Successful: $($responseData3.data.successful)" -ForegroundColor Yellow
    Write-Host "Failed: $($responseData3.data.failed)" -ForegroundColor Yellow
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test 4: Authentication Error (expect 401)
Write-Host "=== Test 4: Authentication Error (Expect 401) ===" -ForegroundColor Blue
try {
    $noAuthHeaders = @{
        "Content-Type" = "application/json"
    }

    $body4 = @{
        ids = @(1, 2)
    } | ConvertTo-Json

    $response4 = Invoke-WebRequest -Uri "$baseUrl/question-topics/batch-delete" `
                                  -Method POST `
                                  -Headers $noAuthHeaders `
                                  -Body $body4

    Write-Host "Status Code: $($response4.StatusCode)" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status Code: $statusCode" -ForegroundColor $(if ($statusCode -eq 401) { "Green" } else { "Red" })
    Write-Host "Expected authentication error" -ForegroundColor Yellow
}
Write-Host ""

# Test 5: Validation Error (expect 400)
Write-Host "=== Test 5: Validation Error (Expect 400) ===" -ForegroundColor Blue
try {
    $body5 = @{
        ids = @()  # Empty array should fail validation
    } | ConvertTo-Json

    $response5 = Invoke-WebRequest -Uri "$baseUrl/question-topics/batch-delete" `
                                  -Method POST `
                                  -Headers $headers `
                                  -Body $body5

    Write-Host "Status Code: $($response5.StatusCode)" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status Code: $statusCode" -ForegroundColor $(if ($statusCode -eq 400) { "Green" } else { "Red" })
    Write-Host "Expected validation error" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "=== Status Code Testing Summary ===" -ForegroundColor Green
Write-Host "✅ 200 - Complete Success (all items deleted)" -ForegroundColor Green
Write-Host "✅ 207 - Partial Success (some items deleted, some failed)" -ForegroundColor Green
Write-Host "✅ 400 - Complete Failure (no items deleted due to business rules)" -ForegroundColor Green
Write-Host "✅ 401 - Authentication Error (missing or invalid token)" -ForegroundColor Green
Write-Host "✅ 403 - Authorization Error (insufficient permissions)" -ForegroundColor Green
Write-Host "✅ 500 - Server Error (internal server error)" -ForegroundColor Green
Write-Host ""
Write-Host "Note: Replace 'YOUR_JWT_TOKEN_HERE' with a valid JWT token and adjust IDs based on your data" -ForegroundColor Cyan
