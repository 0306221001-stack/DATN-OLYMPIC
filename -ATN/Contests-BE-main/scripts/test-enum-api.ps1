# Enum API Testing Script

# Base configuration
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "=== Enum API Testing Script ===" -ForegroundColor Green
Write-Host "Testing Enum API endpoints..." -ForegroundColor Yellow

# Test 1: Get all enums
Write-Host "`n1. Testing GET /api/enums (Get all enums)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/enums" -Method GET -Headers $headers
    Write-Host "✅ Success: Retrieved all enums" -ForegroundColor Green
    Write-Host "   Available enums: $($response.data.Keys -join ', ')" -ForegroundColor White
    Write-Host "   Total enums: $($response.data.Keys.Count)" -ForegroundColor White
}
catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Get enum names
Write-Host "`n2. Testing GET /api/enums/names (Get enum names)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/enums/names" -Method GET -Headers $headers
    Write-Host "✅ Success: Retrieved enum names" -ForegroundColor Green
    Write-Host "   Enum names: $($response.data -join ', ')" -ForegroundColor White
}
catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Get specific enum (QuestionType)
Write-Host "`n3. Testing GET /api/enums/QuestionType (Get specific enum)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/enums/QuestionType" -Method GET -Headers $headers
    Write-Host "✅ Success: Retrieved QuestionType enum" -ForegroundColor Green
    Write-Host "   Values: $($response.data.values | ConvertTo-Json -Compress)" -ForegroundColor White
    Write-Host "   Options count: $($response.data.options.Count)" -ForegroundColor White
}
catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Get enum values (Role)
Write-Host "`n4. Testing GET /api/enums/Role/values (Get enum values)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/enums/Role/values" -Method GET -Headers $headers
    Write-Host "✅ Success: Retrieved Role values" -ForegroundColor Green
    Write-Host "   Values: $($response.data -join ', ')" -ForegroundColor White
}
catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Get enum options (Difficulty)
Write-Host "`n5. Testing GET /api/enums/Difficulty/options (Get enum options)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/enums/Difficulty/options" -Method GET -Headers $headers
    Write-Host "✅ Success: Retrieved Difficulty options" -ForegroundColor Green
    foreach ($option in $response.data) {
        Write-Host "   $($option.label) -> $($option.value)" -ForegroundColor White
    }
}
catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Test non-existent enum (should return 404)
Write-Host "`n6. Testing GET /api/enums/NonExistentEnum (Error handling)" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/enums/NonExistentEnum" -Method GET -Headers $headers
    Write-Host "❌ Unexpected success - should have returned 404" -ForegroundColor Red
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 404) {
        Write-Host "✅ Success: Correctly returned 404 for non-existent enum" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed: Expected 404 but got $statusCode" -ForegroundColor Red
    }
}

# Test 7: Test specific enum values for all available enums
Write-Host "`n7. Testing all available enums" -ForegroundColor Cyan
$enumNames = @("Role", "QuestionType", "Difficulty", "ContestStatus", "ContestantStatus", "ContestantMatchStatus", "RescueType", "RescueStatus", "AwardType", "ControlKey", "ControlValue")

foreach ($enumName in $enumNames) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/enums/$enumName/options" -Method GET -Headers $headers
        Write-Host "   ✅ $enumName : $($response.data.Count) options" -ForegroundColor Green
    }
    catch {
        Write-Host "   ❌ $enumName : Failed to retrieve" -ForegroundColor Red
    }
}

# Test 8: Response format validation
Write-Host "`n8. Testing response format validation" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/enums/QuestionType" -Method GET -Headers $headers
    
    # Check required fields
    $hasSuccess = $response.PSObject.Properties.Name -contains "success"
    $hasMessage = $response.PSObject.Properties.Name -contains "message"
    $hasData = $response.PSObject.Properties.Name -contains "data"
    $hasTimestamp = $response.PSObject.Properties.Name -contains "timestamp"
    
    if ($hasSuccess -and $hasMessage -and $hasData -and $hasTimestamp) {
        Write-Host "✅ Success: Response format is valid" -ForegroundColor Green
        
        # Check data structure
        $data = $response.data
        $hasName = $data.PSObject.Properties.Name -contains "name"
        $hasValues = $data.PSObject.Properties.Name -contains "values"
        $hasOptions = $data.PSObject.Properties.Name -contains "options"
        
        if ($hasName -and $hasValues -and $hasOptions) {
            Write-Host "   ✅ Data structure is correct" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Data structure is missing required fields" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Failed: Response format is invalid" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 9: Performance test (multiple requests)
Write-Host "`n9. Testing performance (10 requests)" -ForegroundColor Cyan
$startTime = Get-Date
$successCount = 0

for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/enums/QuestionType/options" -Method GET -Headers $headers
        $successCount++
    }
    catch {
        # Ignore errors for performance test
    }
}

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalMilliseconds
$avgTime = $duration / 10

Write-Host "✅ Performance test completed" -ForegroundColor Green
Write-Host "   Successful requests: $successCount/10" -ForegroundColor White
Write-Host "   Total time: $([math]::Round($duration, 2))ms" -ForegroundColor White
Write-Host "   Average time: $([math]::Round($avgTime, 2))ms per request" -ForegroundColor White

# Summary
Write-Host "`n=== Test Summary ===" -ForegroundColor Green
Write-Host "Enum API testing completed!" -ForegroundColor Yellow
Write-Host "`nTested endpoints:" -ForegroundColor White
Write-Host "✓ GET /api/enums - Get all enums"
Write-Host "✓ GET /api/enums/names - Get enum names"
Write-Host "✓ GET /api/enums/:enumName - Get specific enum"
Write-Host "✓ GET /api/enums/:enumName/values - Get enum values"
Write-Host "✓ GET /api/enums/:enumName/options - Get enum options"
Write-Host "✓ Error handling for non-existent enums"
Write-Host "✓ Response format validation"
Write-Host "✓ Performance testing"

Write-Host "`nAll endpoints are public and don't require authentication." -ForegroundColor Cyan
Write-Host "Use these endpoints to populate dropdowns and UI components in your frontend application." -ForegroundColor Cyan
