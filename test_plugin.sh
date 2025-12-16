#!/bin/bash

# Test script for NesVentory Gemini Plugin
# This script tests all major endpoints

echo "======================================"
echo "NesVentory Gemini Plugin Test Suite"
echo "======================================"
echo ""

BASE_URL="http://localhost:8000"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test an endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=$3
    
    echo -n "Testing $name... "
    
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response_code" -eq "$expected_code" ]; then
        echo -e "${GREEN}PASS${NC} (HTTP $response_code)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}FAIL${NC} (Expected HTTP $expected_code, got HTTP $response_code)"
        ((TESTS_FAILED++))
    fi
}

# Test 1: Root endpoint
echo "Test 1: Root Endpoint"
test_endpoint "GET /" "$BASE_URL/" 200
echo ""

# Test 2: Health endpoint
echo "Test 2: Health Check"
test_endpoint "GET /health" "$BASE_URL/health" 200

# Verify health response content
echo -n "Checking health response content... "
health_response=$(curl -s "$BASE_URL/health")
if echo "$health_response" | grep -q "status" && echo "$health_response" | grep -q "version"; then
    echo -e "${GREEN}PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${NC}"
    ((TESTS_FAILED++))
fi
echo ""

# Test 3: API Documentation
echo "Test 3: API Documentation"
test_endpoint "GET /docs" "$BASE_URL/docs" 200
test_endpoint "GET /openapi.json" "$BASE_URL/openapi.json" 200
echo ""

# Test 4: Image endpoint (without API key, should return 503)
echo "Test 4: Image Identification Endpoint"
echo -n "Testing POST /nesventory/identify/image (without file)... "
response_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/nesventory/identify/image")
if [ "$response_code" -eq "422" ]; then
    echo -e "${GREEN}PASS${NC} (HTTP $response_code - Missing file parameter)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${NC} (Expected HTTP 422, got HTTP $response_code)"
    ((TESTS_FAILED++))
fi
echo ""

# Test 5: Barcode endpoint (without API key, should return 503)
echo "Test 5: Barcode Lookup Endpoint"
echo -n "Testing POST /lookup-barcode (without API key)... "
response_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/lookup-barcode" \
    -H "Content-Type: application/json" \
    -d '{"barcode": "012345678901"}')
if [ "$response_code" -eq "503" ]; then
    echo -e "${GREEN}PASS${NC} (HTTP $response_code - API key not configured)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${NC} (Expected HTTP 503, got HTTP $response_code)"
    ((TESTS_FAILED++))
fi
echo ""

# Test 6: Parse data tag endpoint (without API key, should return 503)
echo "Test 6: Data Tag Parsing Endpoint"
echo -n "Testing POST /parse-data-tag (without file)... "
response_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/parse-data-tag")
if [ "$response_code" -eq "422" ]; then
    echo -e "${GREEN}PASS${NC} (HTTP $response_code - Missing file parameter)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL${NC} (Expected HTTP 422, got HTTP $response_code)"
    ((TESTS_FAILED++))
fi
echo ""

# Summary
echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed! ✗${NC}"
    exit 1
fi
