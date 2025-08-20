# Creator Portfolio Hub Deployment Script (PowerShell)
param(
    [string]$Environment = "development"
)

# Configuration
$ComposeFile = "docker-compose.yml"
if ($Environment -eq "production") {
    $ComposeFile = "docker-compose.prod.yml"
}

Write-Host "🚀 Deploying Creator Portfolio Hub ($Environment)" -ForegroundColor Green

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker and try again." -ForegroundColor Red
    exit 1
}

# Check if environment file exists
if ($Environment -eq "production" -and -not (Test-Path ".env")) {
    Write-Host "❌ .env file not found. Please create one based on .env.example" -ForegroundColor Red
    exit 1
}

# Create necessary directories
Write-Host "📁 Creating necessary directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "nginx/ssl" | Out-Null
New-Item -ItemType Directory -Force -Path "logs" | Out-Null

# Pull latest images (for production)
if ($Environment -eq "production") {
    Write-Host "📥 Pulling latest images..." -ForegroundColor Yellow
    docker-compose -f $ComposeFile pull
}

# Stop existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose -f $ComposeFile down

# Build and start containers
Write-Host "🔨 Building and starting containers..." -ForegroundColor Yellow
docker-compose -f $ComposeFile up -d --build

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Run database migrations
Write-Host "🗄️ Running database migrations..." -ForegroundColor Yellow
docker-compose -f $ComposeFile exec -T backend npx prisma migrate deploy

# Health check
Write-Host "🏥 Performing health check..." -ForegroundColor Yellow
$HealthUrl = if ($Environment -eq "production") { "http://localhost/health" } else { "http://localhost:3000/api/health" }

$HealthCheckPassed = $false
for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Health check passed!" -ForegroundColor Green
            $HealthCheckPassed = $true
            break
        }
    } catch {
        Write-Host "⏳ Waiting for services... (attempt $i/10)" -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    }
}

if (-not $HealthCheckPassed) {
    Write-Host "❌ Health check failed after 10 attempts" -ForegroundColor Red
    Write-Host "📋 Container status:" -ForegroundColor Yellow
    docker-compose -f $ComposeFile ps
    Write-Host "📋 Backend logs:" -ForegroundColor Yellow
    docker-compose -f $ComposeFile logs --tail=50 backend
    exit 1
}

# Show running containers
Write-Host "📋 Running containers:" -ForegroundColor Yellow
docker-compose -f $ComposeFile ps

# Show access URLs
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "🔧 Backend API: http://localhost:3001" -ForegroundColor Green

if ($Environment -eq "production") {
    Write-Host "🌐 Production URL: http://localhost" -ForegroundColor Green
    Write-Host "💡 Don't forget to configure SSL certificates for HTTPS" -ForegroundColor Yellow
}

Write-Host "📊 To view logs: docker-compose -f $ComposeFile logs -f" -ForegroundColor Yellow
Write-Host "🛑 To stop: docker-compose -f $ComposeFile down" -ForegroundColor Yellow