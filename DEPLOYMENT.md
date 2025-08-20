# Creator Portfolio Hub - Deployment Guide

This guide covers the deployment of the Creator Portfolio Hub application using Docker containers.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- PostgreSQL 15+ (if running without Docker)
- Redis (if running without Docker)
- Meilisearch (if running without Docker)

## Quick Start

### Development Deployment

1. Clone the repository:
```bash
git clone <repository-url>
cd creator-portfolio-hub
```

2. Copy environment configuration:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run the deployment script:
```bash
# Linux/macOS
./scripts/deploy.sh development

# Windows
.\scripts\deploy.ps1 development
```

4. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Meilisearch: http://localhost:7700

### Production Deployment

1. Set up environment variables:
```bash
cp .env.example .env
# Configure production values in .env
```

2. Configure SSL certificates (optional):
```bash
# Place your SSL certificates in nginx/ssl/
# cert.pem and key.pem
```

3. Deploy:
```bash
# Linux/macOS
./scripts/deploy.sh production

# Windows
.\scripts\deploy.ps1 production
```

4. Access the application:
- Production URL: http://localhost (or your domain)
- Monitoring: See monitoring section below

## Architecture

### Services

- **Frontend**: Next.js application (port 3000)
- **Backend**: Express.js API (port 3001)
- **Database**: PostgreSQL (port 5432)
- **Cache**: Redis (port 6379)
- **Search**: Meilisearch (port 7700)
- **Proxy**: Nginx (ports 80/443)

### Docker Images

- Frontend: Built from `frontend/Dockerfile`
- Backend: Built from `backend/Dockerfile`
- Database: `postgres:15-alpine`
- Cache: `redis:7-alpine`
- Search: `getmeili/meilisearch:v1.5`
- Proxy: `nginx:alpine`

## Configuration

### Environment Variables

Key environment variables that must be configured:

#### Database
- `POSTGRES_PASSWORD`: PostgreSQL password
- `DATABASE_URL`: Full database connection string

#### Security
- `JWT_SECRET`: Secret key for JWT tokens
- `REDIS_PASSWORD`: Redis password
- `MEILISEARCH_MASTER_KEY`: Meilisearch master key

#### AWS S3 (File Storage)
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `AWS_REGION`: AWS region
- `AWS_S3_BUCKET`: S3 bucket name

#### Application
- `NEXT_PUBLIC_API_URL`: Frontend API URL
- `NODE_ENV`: Environment (development/production)

### SSL Configuration

For production HTTPS:

1. Obtain SSL certificates
2. Place certificates in `nginx/ssl/`:
   - `cert.pem`: Certificate file
   - `key.pem`: Private key file
3. Uncomment HTTPS server block in `nginx/nginx.conf`
4. Update environment variables with HTTPS URLs

## Database Management

### Migrations

Run database migrations:
```bash
# Development
docker-compose exec backend npx prisma migrate deploy

# Production
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### Backup

Create database backup:
```bash
docker-compose exec postgres pg_dump -U postgres creator_hub > backup.sql
```

Restore database:
```bash
docker-compose exec -T postgres psql -U postgres creator_hub < backup.sql
```

## Monitoring

### Health Checks

- Application health: `GET /health`
- Detailed health: `GET /health/detailed`
- Readiness: `GET /health/ready`
- Liveness: `GET /health/live`

### Monitoring Stack

Deploy monitoring services:
```bash
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

Access monitoring:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)
- Uptime Kuma: http://localhost:3002

### Logs

View application logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# With timestamps
docker-compose logs -f -t backend
```

## Maintenance

### System Integration

The application includes integrated maintenance endpoints:

#### Reindex Search
```bash
curl -X POST http://localhost:3001/api/maintenance/reindex \
  -H "Authorization: Bearer <admin-token>"
```

#### Recalculate Engagement Scores
```bash
curl -X POST http://localhost:3001/api/maintenance/recalculate-engagement \
  -H "Authorization: Bearer <admin-token>"
```

#### Update Analytics
```bash
curl -X POST http://localhost:3001/api/maintenance/update-unique-views \
  -H "Authorization: Bearer <admin-token>"
```

#### System Status
```bash
curl http://localhost:3001/api/maintenance/status \
  -H "Authorization: Bearer <admin-token>"
```

### Updates

Update the application:
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Run migrations if needed
docker-compose exec backend npx prisma migrate deploy
```

### Scaling

Scale specific services:
```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Scale with load balancer
# Update nginx.conf to include multiple backend instances
```

## CI/CD Pipeline

The application includes GitHub Actions workflow for:

- Automated testing
- Security scanning
- Docker image building
- Production deployment

### Setup

1. Configure GitHub secrets:
   - `POSTGRES_PASSWORD`
   - `REDIS_PASSWORD`
   - `MEILISEARCH_MASTER_KEY`
   - `JWT_SECRET`
   - AWS credentials
   - Other environment variables

2. Set up self-hosted runner for production deployment

3. Push to main branch triggers deployment

## Troubleshooting

### Common Issues

#### Services not starting
```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs <service-name>

# Restart specific service
docker-compose restart <service-name>
```

#### Database connection issues
```bash
# Check database logs
docker-compose logs postgres

# Test connection
docker-compose exec backend npx prisma db push
```

#### Search not working
```bash
# Check Meilisearch logs
docker-compose logs meilisearch

# Reindex projects
curl -X POST http://localhost:3001/api/maintenance/reindex
```

#### Performance issues
```bash
# Check resource usage
docker stats

# Check application metrics
curl http://localhost:3001/health/metrics
```

### Debug Mode

Enable debug logging:
```bash
# Set in .env
LOG_LEVEL=debug
ENABLE_REQUEST_LOGGING=true

# Restart services
docker-compose restart backend
```

## Security Considerations

### Production Security

1. **Environment Variables**: Never commit secrets to version control
2. **SSL/TLS**: Always use HTTPS in production
3. **Database**: Use strong passwords and restrict access
4. **API Keys**: Rotate keys regularly
5. **Updates**: Keep dependencies updated
6. **Monitoring**: Monitor for security events
7. **Backups**: Regular encrypted backups
8. **Access Control**: Implement proper authentication and authorization

### Security Headers

The Nginx configuration includes security headers:
- HSTS
- X-Frame-Options
- X-Content-Type-Options
- Content Security Policy
- Referrer Policy

## Performance Optimization

### Caching Strategy

- Redis for session and data caching
- ISR for static project pages
- CDN for static assets (recommended)
- Database query optimization

### Monitoring Performance

- Use Prometheus metrics
- Monitor response times
- Track error rates
- Monitor resource usage

## Support

For deployment issues:

1. Check logs: `docker-compose logs -f`
2. Verify configuration: Review `.env` file
3. Test connectivity: Use health check endpoints
4. Check resources: `docker stats`
5. Review documentation: This guide and code comments

## License

[Your License Here]