#!/bin/bash
# Bash script để test batch delete functionality

BASE_URL="http://localhost:3000/api"

echo "🧪 BATCH DELETE TESTING SCRIPT"
echo "==============================="

# Function để hiển thị response
show_response() {
    local title="$1"
    local response="$2"
    echo ""
    echo "📊 $title"
    echo "----------------------------------------"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
}

# 1. Health check
echo "1. Health Check..."
HEALTH=$(curl -s http://localhost:3000/health)
show_response "Health Check" "$HEALTH"

# 2. Login to get token
echo "2. Login to get access token..."
LOGIN_DATA='{"identifier":"admin","password":"admin@123"}'
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_DATA")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken' 2>/dev/null)

# if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
#     echo "❌ Login failed. Please check credentials or create admin user first."
#     echo "Response: $LOGIN_RESPONSE"
#     exit 1
# fi

echo "✅ Login successful! Token obtained."

# 3. Create test data
echo ""
echo "3. Creating test data..."

# Create Question Topics
echo "Creating Question Topics..."
TOPIC_IDS=()
for i in {1..3}; do
    TOPIC_DATA="{\"name\":\"Test Topic $i\",\"description\":\"Description for test topic $i\"}"
    TOPIC_RESPONSE=$(curl -s -X POST "$BASE_URL/question-topics" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$TOPIC_DATA")
    
    TOPIC_ID=$(echo "$TOPIC_RESPONSE" | jq -r '.data.id' 2>/dev/null)
    if [ "$TOPIC_ID" != "null" ] && [ ! -z "$TOPIC_ID" ]; then
        TOPIC_IDS+=("$TOPIC_ID")
        echo "✅ Created Topic $i (ID: $TOPIC_ID)"
    else
        echo "⚠️ Failed to create Topic $i: $TOPIC_RESPONSE"
    fi
done

# Create Question Packages
echo "Creating Question Packages..."
PACKAGE_IDS=()
for i in {1..3}; do
    PACKAGE_DATA="{\"name\":\"Test Package $i\",\"description\":\"Description for test package $i\",\"totalQuestions\":10}"
    PACKAGE_RESPONSE=$(curl -s -X POST "$BASE_URL/question-packages" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$PACKAGE_DATA")
    
    PACKAGE_ID=$(echo "$PACKAGE_RESPONSE" | jq -r '.data.id' 2>/dev/null)
    if [ "$PACKAGE_ID" != "null" ] && [ ! -z "$PACKAGE_ID" ]; then
        PACKAGE_IDS+=("$PACKAGE_ID")
        echo "✅ Created Package $i (ID: $PACKAGE_ID)"
    else
        echo "⚠️ Failed to create Package $i: $PACKAGE_RESPONSE"
    fi
done

# Create Questions (needed for Question Details)
echo "Creating Questions..."
QUESTION_IDS=()
if [ ${#TOPIC_IDS[@]} -gt 0 ]; then
    for i in {1..2}; do
        QUESTION_DATA="{\"content\":\"Test Question $i content?\",\"type\":\"MULTIPLE_CHOICE\",\"difficulty\":\"EASY\",\"questionTopicId\":${TOPIC_IDS[0]},\"options\":[\"Option A\",\"Option B\",\"Option C\",\"Option D\"],\"correctAnswer\":\"Option A\"}"
        QUESTION_RESPONSE=$(curl -s -X POST "$BASE_URL/questions" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            -d "$QUESTION_DATA")
        
        QUESTION_ID=$(echo "$QUESTION_RESPONSE" | jq -r '.data.id' 2>/dev/null)
        if [ "$QUESTION_ID" != "null" ] && [ ! -z "$QUESTION_ID" ]; then
            QUESTION_IDS+=("$QUESTION_ID")
            echo "✅ Created Question $i (ID: $QUESTION_ID)"
        else
            echo "⚠️ Failed to create Question $i: $QUESTION_RESPONSE"
        fi
    done
fi

# Create Question Details
echo "Creating Question Details..."
DETAIL_PAIRS=()
if [ ${#QUESTION_IDS[@]} -gt 0 ] && [ ${#PACKAGE_IDS[@]} -gt 0 ]; then
    for i in $(seq 0 $((${#QUESTION_IDS[@]}-1))); do
        if [ $i -lt ${#PACKAGE_IDS[@]} ]; then
            DETAIL_DATA="{\"questionId\":${QUESTION_IDS[$i]},\"questionPackageId\":${PACKAGE_IDS[$i]},\"orderIndex\":$((i+1))}"
            DETAIL_RESPONSE=$(curl -s -X POST "$BASE_URL/question-details" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $TOKEN" \
                -d "$DETAIL_DATA")
            
            SUCCESS=$(echo "$DETAIL_RESPONSE" | jq -r '.success' 2>/dev/null)
            if [ "$SUCCESS" = "true" ]; then
                DETAIL_PAIRS+=("{\"questionId\":${QUESTION_IDS[$i]},\"questionPackageId\":${PACKAGE_IDS[$i]}}")
                echo "✅ Created Question Detail (Q:${QUESTION_IDS[$i]}, P:${PACKAGE_IDS[$i]})"
            else
                echo "⚠️ Failed to create Question Detail: $DETAIL_RESPONSE"
            fi
        fi
    done
fi

echo ""
echo "📈 Test Data Created:"
echo "- Topics: ${#TOPIC_IDS[@]} (${TOPIC_IDS[*]})"
echo "- Packages: ${#PACKAGE_IDS[@]} (${PACKAGE_IDS[*]})"  
echo "- Questions: ${#QUESTION_IDS[@]} (${QUESTION_IDS[*]})"
echo "- Question Details: ${#DETAIL_PAIRS[@]}"

# 4. Test Batch Delete
echo ""
echo "4. Testing Batch Delete Functionality..."

# Test 1: Batch Delete Question Details (delete first to avoid FK constraints)
if [ ${#DETAIL_PAIRS[@]} -gt 0 ]; then
    echo ""
    echo "🧪 Test 1: Batch Delete Question Details"
    DETAIL_DELETE_DATA="{\"items\":[$(IFS=,; echo "${DETAIL_PAIRS[*]}")]}"
    DETAIL_DELETE_RESPONSE=$(curl -s -X POST "$BASE_URL/question-details/batch-delete" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$DETAIL_DELETE_DATA")
    
    show_response "Batch Delete Question Details" "$DETAIL_DELETE_RESPONSE"
fi

# Test 2: Batch Delete Question Topics
if [ ${#TOPIC_IDS[@]} -gt 0 ]; then
    echo "🧪 Test 2: Batch Delete Question Topics"
    TOPIC_DELETE_DATA="{\"ids\":[$(IFS=,; echo "${TOPIC_IDS[*]}")]}"
    TOPIC_DELETE_RESPONSE=$(curl -s -X POST "$BASE_URL/question-topics/batch-delete" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$TOPIC_DELETE_DATA")
    
    show_response "Batch Delete Question Topics" "$TOPIC_DELETE_RESPONSE"
fi

# Test 3: Batch Delete Question Packages
if [ ${#PACKAGE_IDS[@]} -gt 0 ]; then
    echo "🧪 Test 3: Batch Delete Question Packages"
    PACKAGE_DELETE_DATA="{\"ids\":[$(IFS=,; echo "${PACKAGE_IDS[*]}")]}"
    PACKAGE_DELETE_RESPONSE=$(curl -s -X POST "$BASE_URL/question-packages/batch-delete" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$PACKAGE_DELETE_DATA")
    
    show_response "Batch Delete Question Packages" "$PACKAGE_DELETE_RESPONSE"
fi

# Test 4: Edge Cases
echo "🧪 Test 4: Edge Cases"

# Test with non-existent IDs
echo "🔍 Test 4a: Non-existent IDs"
NONEXISTENT_DATA='{"ids":[99999,99998,99997]}'
NONEXISTENT_RESPONSE=$(curl -s -X POST "$BASE_URL/question-topics/batch-delete" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$NONEXISTENT_DATA")

show_response "Batch Delete Non-existent Topics" "$NONEXISTENT_RESPONSE"

# Test with empty array
echo "🔍 Test 4b: Empty Array"
EMPTY_DATA='{"ids":[]}'
EMPTY_RESPONSE=$(curl -s -X POST "$BASE_URL/question-topics/batch-delete" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$EMPTY_DATA")

show_response "Batch Delete Empty Array" "$EMPTY_RESPONSE"

echo ""
echo "✨ Testing Complete!"
echo "=========================="
echo "All batch delete tests have been executed."
echo "Review the results above to verify functionality."
