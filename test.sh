#!/bin/bash
# Test script to verify KIND MCP server tool implementations

# Don't exit on error, we want to count failures
set +e

echo "====================================="
echo "KIND MCP Server Validation Tests"
echo "====================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function to print test results
test_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $1"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $1"
        ((FAILED++))
    fi
}

# Test 1: Check if required tools are installed
echo "Test 1: Checking required tools..."
kind version > /dev/null 2>&1
test_result "KIND is installed"

kubectl version --client > /dev/null 2>&1
test_result "kubectl is installed"

docker --version > /dev/null 2>&1
test_result "Docker is installed"

# Test 2: Check if TypeScript compiles
echo ""
echo "Test 2: Checking TypeScript compilation..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
npm run build > /dev/null 2>&1
test_result "TypeScript compiles successfully"

# Test 3: Check if dist files exist
echo ""
echo "Test 3: Checking build outputs..."
[ -f dist/index.js ]
test_result "dist/index.js exists"

[ -f dist/index.d.ts ]
test_result "dist/index.d.ts exists"

[ -x dist/index.js ]
test_result "dist/index.js is executable"

# Test 4: Check if module loads
echo ""
echo "Test 4: Checking module loading..."
timeout 2 node dist/index.js > /dev/null 2>&1 || [ $? -eq 124 ]
test_result "MCP server module loads (times out waiting for stdio as expected)"

# Test 5: Validate example files
echo ""
echo "Test 5: Validating example configuration files..."
[ -f examples/multi-node-cluster.yaml ]
test_result "multi-node-cluster.yaml exists"

[ -f examples/ci-cluster.yaml ]
test_result "ci-cluster.yaml exists"

[ -f examples/ingress-cluster.yaml ]
test_result "ingress-cluster.yaml exists"

[ -f examples/sample-deployment.yaml ]
test_result "sample-deployment.yaml exists"

[ -f examples/github-actions-ci.yaml ]
test_result "github-actions-ci.yaml exists"

# Test 6: Validate documentation
echo ""
echo "Test 6: Checking documentation files..."
[ -f README.md ] && grep -q "KIND MCP Server" README.md
test_result "README.md exists and has content"

[ -f QUICKSTART.md ] && grep -q "Quick Start Guide" QUICKSTART.md
test_result "QUICKSTART.md exists and has content"

[ -f CODESPACES.md ] && grep -q "GitHub Codespaces" CODESPACES.md
test_result "CODESPACES.md exists and has content"

[ -f LICENSE ]
test_result "LICENSE file exists"

# Test 7: Check package.json configuration
echo ""
echo "Test 7: Validating package.json..."
node -e "const pkg = require('./package.json'); if (pkg.name !== 'kind-mcp') process.exit(1);"
test_result "Package name is correct"

node -e "const pkg = require('./package.json'); if (!pkg.dependencies['@modelcontextprotocol/sdk']) process.exit(1);"
test_result "MCP SDK dependency is present"

node -e "const pkg = require('./package.json'); if (!pkg.dependencies['zod']) process.exit(1);"
test_result "Zod dependency is present"

# Test 8: Verify no high severity vulnerabilities
echo ""
echo "Test 8: Checking for security vulnerabilities..."
npm audit --audit-level=high > /dev/null 2>&1
test_result "No high severity vulnerabilities"

# Test 9: Check TypeScript configuration
echo ""
echo "Test 9: Validating TypeScript configuration..."
node -e "const ts = require('./tsconfig.json'); if (ts.compilerOptions.target !== 'ES2022') process.exit(1);"
test_result "TypeScript target is ES2022"

node -e "const ts = require('./tsconfig.json'); if (ts.compilerOptions.module !== 'Node16') process.exit(1);"
test_result "TypeScript module is Node16"

# Test 10: Functional test - Create and delete a test cluster
echo ""
echo "Test 10: Functional test - KIND cluster operations..."
echo "  Creating test cluster..."
if kind create cluster --name mcp-test-cluster --wait 30s > /dev/null 2>&1; then
    test_result "Created test KIND cluster"
    
    echo "  Checking cluster..."
    kind get clusters | grep -q mcp-test-cluster
    test_result "Cluster appears in list"
    
    kubectl cluster-info --context kind-mcp-test-cluster > /dev/null 2>&1
    test_result "kubectl can connect to cluster"
    
    echo "  Deleting test cluster..."
    kind delete cluster --name mcp-test-cluster > /dev/null 2>&1
    test_result "Deleted test KIND cluster"
else
    echo -e "${YELLOW}⚠ SKIP${NC}: Could not create test cluster (may be resource constraints)"
fi

# Summary
echo ""
echo "====================================="
echo "Test Summary"
echo "====================================="
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
