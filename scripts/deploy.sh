#!/bin/bash

# Creator Portfolio Hub Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
COMPOSE_FILE="docker-compose.yml"

if [ "$ENVIRONMENT" = "production" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
fi

echo -e "${GREEN}🚀 Deploying Creator Portfolio Hub ($ENVIRONMENT)${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if environment file exists
if [ "$ENVIRONMENT" = "production" ] && [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found. Please create one based on .env.example${NC}"
    exit 1
fi

# Create necessary directories
echo -e "${YELLOW}📁 Creating necessary directories...${NC}"
mkdir -p nginx/ssl
mkdir -p logs

# Pull latest images (for production)
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${YELLOW}📥 Pulling latest images...${NC}"
    docker-compose -f $COMPOSE_FILE pull
fi

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f $COMPOSE_FILE down

# Build and start containers
echo -e "${YELLOW}🔨 Building and starting containers...${NC}"
docker-compose -f $COMPOSE_FILE up -d --build

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Run database migrations
echo -e "${YELLOW}🗄️ Running database migrations...${NC}"
docker-compose -f $COMPOSE_FILE exec -T backend npx prisma migrate deploy

# Health check
echo -e "${YELLOW}🏥 Performing health check...${NC}"
if [ "$ENVIRONMENT" = "production" ]; then
    HEALTH_URL="http://localhost/health"
else
    HEALTH_URL="http://localhost:3000/api/health"
fi

for i in {1..10}; do
    if curl -f $HEALTH_URL > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Health check passed!${NC}"
        break
    else
        echo -e "${YELLOW}⏳ Waiting for services... (attempt $i/10)${NC}"
        sleep 10
    fi
    
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Health check failed after 10 attempts${NC}"
        echo -e "${YELLOW}📋 Container status:${NC}"
        docker-compose -f $COMPOSE_FILE ps
        echo -e "${YELLOW}📋 Backend logs:${NC}"
        docker-compose -f $COMPOSE_FILE logs --tail=50 backend
        exit 1
    fi
done

# Show running containers
echo -e "${YELLOW}📋 Running containers:${NC}"
docker-compose -f $COMPOSE_FILE ps

# Show access URLs
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}📱 Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}🔧 Backend API: http://localhost:3001${NC}"

if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${GREEN}🌐 Production URL: http://localhost${NC}"
    echo -e "${YELLOW}💡 Don't forget to configure SSL certificates for HTTPS${NC}"
fi

echo -e "${YELLOW}📊 To view logs: docker-compose -f $COMPOSE_FILE logs -f${NC}"
echo -e "${YELLOW}🛑 To stop: docker-compose -f $COMPOSE_FILE down${NC}"