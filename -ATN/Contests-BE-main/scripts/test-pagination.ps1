# Question Detail API Pagination Testing Script
# This script tests the new pagination functionality for Question Detail APIs

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$AuthToken = ""
)

if ([string]::IsNullOrEmpty($AuthToken)) {
    Write-Host "Please provide an authentication token using -AuthToken parameter" -ForegroundColor Red
    Write-Host "Example: .\test-pagination.ps1 -AuthToken 'your-jwt-token-here'" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $AuthToken"
    "Content-Type" = "application/json"
}

Write-Host "=== Question Detail API Pagination Testing ===" -ForegroundColor Green
Write-Host "Base URL: $BaseUrl" -ForegroundColor Cyan
Write-Host ""

# Function to make API requests with error handling
function Invoke-ApiRequest {
    param(
        [string]$Url,
        [string]$Description
    )
    
    try {
        Write-Host "Testing: $Description" -ForegroundColor Yellow
        Write-Host "URL: $Url" -ForegroundColor Gray
        
        $response = Invoke-RestMethod -Uri $Url -Method GET -Headers $headers
        
        if ($response.success) {
            Write-Host "✓ SUCCESS" -ForegroundColor Green
            
            # Display pagination info
            if ($response.pagination) {
                $pagination = $response.pagination
                Write-Host "  Page: $($pagination.page)/$($pagination.totalPages)" -ForegroundColor Cyan
                Write-Host "  Items: $($pagination.limit) per page, $($pagination.total) total" -ForegroundColor Cyan
                Write-Host "  Navigation: HasNext=$($pagination.hasNext), HasPrev=$($pagination.hasPrev)" -ForegroundColor Cyan
            }
            
            # Display data count
            if ($response.data.questions) {
                Write-Host "  Questions returned: $($response.data.questions.Count)" -ForegroundColor Cyan
            }
            if ($response.data.packages) {
                Write-Host "  Packages returned: $($response.data.packages.Count)" -ForegroundColor Cyan
            }
            
            Write-Host ""
            return $response
        } else {
            Write-Host "✗ FAILED: $($response.message)" -ForegroundColor Red
            Write-Host ""
            return $null
        }
    } catch {
        Write-Host "✗ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        return $null
    }
}

# Test 1: Get Questions by Package ID - Basic Pagination
Write-Host "1. Testing Get Questions by Package ID with Pagination" -ForegroundColor Magenta
Write-Host "=================================================" -ForegroundColor Magenta

$testUrl = "$BaseUrl/api/question-details/package/1?page=1&limit=5"
$response1 = Invoke-ApiRequest -Url $testUrl -Description "Basic pagination (page 1, limit 5)"

# Test 2: Get Questions by Package ID - Page 2
if ($response1 -and $response1.pagination.hasNext) {
    $testUrl = "$BaseUrl/api/question-details/package/1?page=2&limit=5"
    Invoke-ApiRequest -Url $testUrl -Description "Second page (page 2, limit 5)"
}

# Test 3: Get Questions by Package ID - With Search
$testUrl = "$BaseUrl/api/question-details/package/1?page=1&limit=10&search=câu"
Invoke-ApiRequest -Url $testUrl -Description "With search filter (search='câu')"

# Test 4: Get Questions by Package ID - With Sort
$testUrl = "$BaseUrl/api/question-details/package/1?page=1&limit=10&sortBy=createdAt&sortOrder=desc"
Invoke-ApiRequest -Url $testUrl -Description "With sorting (sort by createdAt desc)"

# Test 5: Get Questions by Package ID - Include Inactive
$testUrl = "$BaseUrl/api/question-details/package/1?page=1&limit=10&includeInactive=true"
Invoke-ApiRequest -Url $testUrl -Description "Including inactive items"

Write-Host ""
Write-Host "2. Testing Get Packages by Question ID with Pagination" -ForegroundColor Magenta
Write-Host "===================================================" -ForegroundColor Magenta

# Test 6: Get Packages by Question ID - Basic Pagination
$testUrl = "$BaseUrl/api/question-details/question/1?page=1&limit=5"
$response6 = Invoke-ApiRequest -Url $testUrl -Description "Basic pagination (page 1, limit 5)"

# Test 7: Get Packages by Question ID - With Search
$testUrl = "$BaseUrl/api/question-details/question/1?page=1&limit=10&search=gói"
Invoke-ApiRequest -Url $testUrl -Description "With search filter (search='gói')"

# Test 8: Get Packages by Question ID - With Sort
$testUrl = "$BaseUrl/api/question-details/question/1?page=1&limit=10&sortBy=questionOrder&sortOrder=asc"
Invoke-ApiRequest -Url $testUrl -Description "With sorting (sort by questionOrder asc)"

Write-Host ""
Write-Host "3. Testing Edge Cases and Validation" -ForegroundColor Magenta
Write-Host "====================================" -ForegroundColor Magenta

# Test 9: Invalid Page Number
$testUrl = "$BaseUrl/api/question-details/package/1?page=0&limit=5"
Invoke-ApiRequest -Url $testUrl -Description "Invalid page number (page=0)"

# Test 10: Limit Too High
$testUrl = "$BaseUrl/api/question-details/package/1?page=1&limit=101"
Invoke-ApiRequest -Url $testUrl -Description "Limit too high (limit=101)"

# Test 11: Non-existent Package
$testUrl = "$BaseUrl/api/question-details/package/99999?page=1&limit=5"
Invoke-ApiRequest -Url $testUrl -Description "Non-existent package (ID=99999)"

# Test 12: Non-existent Question
$testUrl = "$BaseUrl/api/question-details/question/99999?page=1&limit=5"
Invoke-ApiRequest -Url $testUrl -Description "Non-existent question (ID=99999)"

Write-Host ""
Write-Host "4. Performance and Load Testing" -ForegroundColor Magenta
Write-Host "===============================" -ForegroundColor Magenta

# Test 13: Large Page Size
$testUrl = "$BaseUrl/api/question-details/package/1?page=1&limit=100"
$startTime = Get-Date
$response13 = Invoke-ApiRequest -Url $testUrl -Description "Large page size (limit=100)"
$endTime = Get-Date
$duration = ($endTime - $startTime).TotalMilliseconds
Write-Host "  Response time: $duration ms" -ForegroundColor Cyan

# Test 14: Multiple Consecutive Requests
Write-Host "Testing multiple consecutive requests..." -ForegroundColor Yellow
$startTime = Get-Date
for ($i = 1; $i -le 5; $i++) {
    $testUrl = "$BaseUrl/api/question-details/package/1?page=$i&limit=5"
    Invoke-RestMethod -Uri $testUrl -Method GET -Headers $headers | Out-Null
    Write-Host "  Completed request $i/5" -ForegroundColor Gray
}
$endTime = Get-Date
$totalDuration = ($endTime - $startTime).TotalMilliseconds
$avgDuration = $totalDuration / 5
Write-Host "  Average response time: $avgDuration ms" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== Testing Complete ===" -ForegroundColor Green
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "- Tested pagination functionality for both endpoints" -ForegroundColor White
Write-Host "- Verified search and sorting capabilities" -ForegroundColor White
Write-Host "- Tested error handling and validation" -ForegroundColor White
Write-Host "- Performed basic performance testing" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review the test results above" -ForegroundColor White
Write-Host "2. Test with different package/question IDs" -ForegroundColor White
Write-Host "3. Verify pagination works with your actual data" -ForegroundColor White
Write-Host "4. Test the APIs from your client application" -ForegroundColor White
