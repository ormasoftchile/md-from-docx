#!/bin/bash

# Regression Test Quick Start Script
# Usage: ./test/functional/quick-regression-test.sh

set -e

echo "🧪 DOCX to Markdown Converter - Regression Test Quick Start"
echo "============================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm not found. Please install Node.js and npm."
    exit 1
fi

print_header "\n1. Checking environment..."
npm --version > /dev/null && print_success "npm is available"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_header "\n2. Installing dependencies (first time)..."
    npm ci
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# Ask user what to run
print_header "\n3. Choose what to run:"
echo "   1) Unit tests only"
echo "   2) Functional tests only"
echo "   3) Regression analysis only"
echo "   4) All tests + regression analysis"
echo "   5) Watch mode (re-run on changes)"
echo ""
read -p "Select option (1-5): " choice

case $choice in
    1)
        print_header "\nRunning unit tests..."
        npm run test:unit
        print_success "Unit tests completed"
        ;;
    2)
        print_header "\nRunning functional tests..."
        npm run test:functional
        print_success "Functional tests completed"
        ;;
    3)
        print_header "\nRunning regression analysis..."
        npm run test:regression
        if [ $? -eq 0 ]; then
            print_success "Regression analysis completed - No regressions detected"
            echo ""
            echo "📄 Report saved to: test/reports/regression-run-*.json"
        else
            print_error "Regressions detected - please review the report above"
            exit 1
        fi
        ;;
    4)
        print_header "\nRunning all tests + regression analysis..."
        npm run test:all
        if [ $? -eq 0 ]; then
            print_success "All tests and regression analysis completed successfully"
        else
            print_error "Some tests or regressions were detected"
            exit 1
        fi
        ;;
    5)
        print_header "\nStarting watch mode..."
        print_warning "Tests will re-run when files change. Press Ctrl+C to exit."
        npm run test:watch
        ;;
    *)
        print_error "Invalid option selected"
        exit 1
        ;;
esac

echo ""
print_header "============================================================"
print_success "Done!"
echo ""
echo "Next steps:"
echo "  - Review test output above"
echo "  - Check regression reports in: test/reports/"
echo "  - Run specific tests: npm run test:functional"
echo "  - Read more: test/functional/README.md"
echo ""
