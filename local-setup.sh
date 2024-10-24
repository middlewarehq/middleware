#!/bin/bash

set -e

# Define color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for user confirmation unless -y argument is provided
if [[ "$1" != "-y" ]]; then
    echo -e "${YELLOW}This script will set up the local development environment by checking and installing various tools and dependencies.${NC}"
    echo -e "${YELLOW}It will:${NC}"
    echo -e "${YELLOW}- Check for Node Version Manager (nvm) or Node.js version manager (n) and install Node.js if not found${NC}"
    echo -e "${YELLOW}- Check for Node.js (version 22) and install if not found${NC}"
    echo -e "${YELLOW}- Check for 'jq' (globally, for JSON parsing) and install if not found${NC}"
    echo -e "${YELLOW}- Check and install necessary JavaScript dependencies for the cli and web-server (locally)${NC}"
    echo -e "${YELLOW}- Set up Python virtual environment and install backend dependencies (locally)${NC}"
    echo -e "${YELLOW}Do you want to proceed? (y/N)${NC}"
    read -n 1 -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "\n${RED}Installation aborted by user.${NC}"
        exit 1
    fi
fi

echo ""

# Check if Node.js 22 is already installed
if command -v node &> /dev/null && [[ "$(node -v)" == v22* ]]; then
    echo -e "${GREEN}Node.js 22 is already installed. Skipping Node.js installation.${NC}"
else
    # Check for nvm or n installation
    if command -v nvm &> /dev/null; then
        echo -e "${GREEN}nvm is already installed.${NC}"
        # Check for Node.js 22 installation with nvm
        if ! nvm ls 22 &> /dev/null; then
            echo -e "${BLUE}Installing Node.js 22 using nvm...${NC}"
            nvm install 22
        else
            echo -e "${GREEN}Node.js 22 is already installed.${NC}"
        fi
        nvm use 22
    elif command -v n &> /dev/null; then
        echo -e "${GREEN}Node.js version manager (n) is already installed.${NC}"
        # Check for Node.js 22 installation with n
        if ! n ls | grep -q 'v22'; then
            echo -e "${BLUE}Installing Node.js 22 using n...${NC}"
            sudo n 22
        else
            echo -e "${GREEN}Node.js 22 is already installed.${NC}"
        fi
    else
        echo -e "${YELLOW}Neither nvm nor n found, installing nvm...${NC}"
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.2/install.sh | bash
        source ~/.nvm/nvm.sh
        echo -e "${BLUE}Installing Node.js 22 using nvm...${NC}"
        nvm install 22
        nvm use 22
    fi
fi

# Install jq if not installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}jq not found, installing...${NC}"
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get install jq -y
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install jq
    else
        echo -e "${RED}Please install jq manually.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}jq is already installed.${NC}"
fi

# Function to get versioned package for yarn add from package.json
get_versioned_package() {
    local package_name=$1
    local version=$(jq -r ".devDependencies[\"$package_name\"]" package.json)
    echo "$package_name@$version"
}

# JavaScript dependencies for cli and webserver
cli_linting_packages=(
    eslint
    eslint-plugin-import
    eslint-plugin-prettier
    eslint-plugin-react
    eslint-plugin-react-hooks
    eslint-plugin-unused-imports
    prettier
    ts-node
    typescript
)

webserver_linting_packages=(
    @typescript-eslint/eslint-plugin
    @typescript-eslint/parser
    eslint
    eslint-config-next
    eslint-plugin-import
    eslint-plugin-prettier
    eslint-plugin-react
    eslint-plugin-unused-imports
    prettier
)

# Navigate to the cli directory and install eslint
echo -e "${BLUE}Navigating to cli directory and installing eslint...${NC}"
cd cli
for package in "${cli_linting_packages[@]}"; do
    if ! yarn list --pattern "$package" &> /dev/null; then
        echo -e "${YELLOW}Installing $package...${NC}"
        yarn add $(get_versioned_package "$package") --dev --frozen-lockfile
    else
        echo -e "${GREEN}$package is already installed.${NC}"
    fi
done
cd ..

# Navigate to the webserver directory and install eslint
echo -e "${BLUE}Navigating to web-server directory and installing eslint...${NC}"
cd web-server
for package in "${webserver_linting_packages[@]}"; do
    if ! yarn list --pattern "$package" &> /dev/null; then
        echo -e "${YELLOW}Installing $package...${NC}"
        yarn add $(get_versioned_package "$package") --dev --frozen-lockfile
    else
        echo -e "${GREEN}$package is already installed.${NC}"
    fi
done
cd ..

# Set up Python environment for pre-commit
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python3 not found, please install Python3 to continue.${NC}"
    exit 1
else
    echo -e "${GREEN}Python3 is already installed.${NC}"
fi

# Create a virtual environment if one doesn't exist
echo -e "${BLUE}Creating virtual environment...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
else
    echo -e "${GREEN}Virtual environment already exists.${NC}"
fi

# Activate virtual environment
echo -e "${BLUE}Activating virtual environment...${NC}"
source venv/bin/activate

# Install backend dependencies
if [ -d "venv" ] && [ -f "venv/bin/activate" ]; then
    echo -e "${BLUE}Installing backend dependencies in the virtual environment...${NC}"
    pip install -r backend/dev-requirements.txt --upgrade
else
    echo -e "${RED}Virtual environment not activated. Please activate the virtual environment before installing dependencies.${NC}"
    exit 1
fi

# Install pre-commit hooks
echo -e "${BLUE}Installing pre-commit hooks...${NC}"
pre-commit install

echo -e "\n\n${GREEN}🚀🚀🚀 Local setup completed successfully 🚀🚀🚀${NC}"
