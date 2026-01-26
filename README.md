# Raspberry Pi API Server

A production-ready RESTful API service deployed on a Raspberry Pi with automated CI/CD pipeline. This project demonstrates modern DevOps practices, containerization, and infrastructure automation.

## 🚀 Features

- **RESTful API**: Full CRUD operations for resource management
- **System Monitoring**: Real-time CPU, memory, and disk metrics
- **Health Checks**: Built-in health monitoring endpoints
- **Data Persistence**: JSON-based storage with Docker volumes
- **Containerized Deployment**: Docker-based containerization with security best practices
- **CI/CD Pipeline**: Automated build, push, and deployment via GitHub Actions
- **Self-Hosted Runner**: GitHub Actions runner on Raspberry Pi for native ARM64 builds
- **Container Registry**: Images stored in GitHub Container Registry (GHCR)

## 🏗️ Architecture

```
┌─────────────────┐
│   GitHub Repo   │
│   (main branch) │
└────────┬────────┘
         │
         │ Push triggers
         ▼
┌─────────────────────────┐
│  GitHub Actions Workflow│
│  (Self-hosted runner)   │
└────────┬────────────────┘
         │
         ├─► Build Docker Image (ARM64)
         ├─► Push to GHCR
         ├─► Stop Old Container
         └─► Deploy New Container
         │
         ▼
┌─────────────────────────┐
│   Raspberry Pi          │
│   ┌──────────────────┐  │
│   │  Docker Container │  │
│   │  Port: 8080       │  │
│   │  Volume: /app/data│  │
│   └──────────────────┘  │
└─────────────────────────┘
```

## 📋 Prerequisites

- Raspberry Pi (ARM64 architecture)
- Docker installed on Raspberry Pi
- GitHub repository
- GitHub Actions self-hosted runner configured on Raspberry Pi

## 🛠️ Setup Instructions

### 1. Install Docker on Raspberry Pi

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Set Up GitHub Actions Runner

```bash
# Create runner directory
mkdir actions-runner && cd actions-runner

# Download runner (ARM64)
curl -o actions-runner-linux-arm64-2.311.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-arm64-2.311.0.tar.gz

# Extract
tar xzf ./actions-runner-linux-arm64-2.311.0.tar.gz

# Configure (get token from GitHub: Settings → Actions → Runners → New self-hosted runner)
./config.sh --url https://github.com/YOUR_USERNAME/YOUR_REPO --token YOUR_TOKEN

# Install as service
sudo ./svc.sh install
sudo ./svc.sh start
```

### 3. Configure GitHub Repository

1. Go to repository Settings → Actions → General
2. Under "Workflow permissions", select "Read and write permissions"
3. This allows the workflow to push to GitHub Container Registry

### 4. Deploy

Simply push to the `main` branch:

```bash
git add .
git commit -m "Deploy application"
git push origin main
```

The GitHub Actions workflow will automatically:
- Build the Docker image for ARM64
- Push to GitHub Container Registry
- Deploy to your Raspberry Pi

## 📡 API Endpoints

### Root
```http
GET /
```
Returns API information and available endpoints.

### Health Check
```http
GET /health
```
Returns health status and uptime information.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00",
  "uptime_seconds": 86400,
  "node_version": "v20.10.0",
  "platform": "linux"
}
```

### System Metrics
```http
GET /metrics
```
Returns real-time system metrics (CPU, memory, disk).

**Response:**
```json
{
      "cpu": {
        "percent": 25.5,
        "count": 4,
        "manufacturer": "ARM",
        "brand": "Cortex-A72",
        "speed": 1500
      },
  "memory": {
    "total_gb": 4.0,
    "available_gb": 2.5,
    "used_gb": 1.5,
    "percent": 37.5
  },
      "disk": {
        "total_gb": 32.0,
        "used_gb": 8.0,
        "free_gb": 24.0,
        "percent": 25.0,
        "filesystem": "ext4",
        "type": "ext4"
      },
  "timestamp": "2024-01-15T10:30:00"
}
```

### Items API

#### Get All Items
```http
GET /api/items
```

#### Create Item
```http
POST /api/items
Content-Type: application/json

{
  "name": "My Item",
  "description": "Item description"
}
```

#### Get Item by ID
```http
GET /api/items/{id}
```

#### Delete Item
```http
DELETE /api/items/{id}
```

## 🧪 Testing

### Local Testing

```bash
# Build image
docker build -t pi-app .

# Run container
docker run -d -p 8080:8080 -v pi-data:/app/data --name pi-app pi-app

# Test endpoints
curl http://localhost:8080/
curl http://localhost:8080/health
curl http://localhost:8080/metrics

# Create an item
curl -X POST http://localhost:8080/api/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Item", "description": "A test item"}'

# Get all items
curl http://localhost:8080/api/items
```

### Remote Testing

Replace `localhost` with your Raspberry Pi's IP address:

```bash
# Find Pi IP
ssh pi@raspberrypi "hostname -I"

# Test from another machine
curl http://<PI_IP_ADDRESS>:8080/health
```

## 📦 Docker Commands

```bash
# View running containers
docker ps

# View logs
docker logs pi-app
docker logs -f pi-app  # Follow logs

# Restart container
docker restart pi-app

# Stop container
docker stop pi-app

# Remove container
docker rm pi-app

# View Docker volumes
docker volume ls
docker volume inspect pi-app-data
```

## 🔒 Security Features

- **Unprivileged User**: Container runs as non-root user (`appuser`)
- **Minimal Base Image**: Uses Node.js slim image to reduce attack surface
- **Health Checks**: Built-in Docker health checks for container monitoring
- **Data Persistence**: Data stored in Docker volumes for persistence
- **No Exposed Secrets**: Uses GitHub token for registry authentication
- **Production Dependencies Only**: Uses `npm ci --only=production` to exclude dev dependencies

## 📊 Monitoring

### Container Health

Docker automatically monitors container health via the HEALTHCHECK instruction. Check status:

```bash
docker ps  # Shows health status
docker inspect pi-app | grep -A 10 Health
```

### Application Logs

```bash
# View recent logs
docker logs --tail 50 pi-app

# Follow logs in real-time
docker logs -f pi-app
```

### System Resources

Access the `/metrics` endpoint to monitor system resources in real-time.

## 🛠️ Development

### Project Structure

```
.
├── .github/
│   └── workflows/
│       └── deploy.yaml      # CI/CD pipeline
├── Dockerfile               # Container definition
├── index.js                 # Main application
├── package.json             # Node.js dependencies
└── README.md               # This file
```

### Environment Variables

- `PORT`: Server port (default: 8080)
- `HOST`: Bind address (default: 0.0.0.0)

### Adding Dependencies

1. Add to `package.json` dependencies
2. Run `npm install` locally to update `package-lock.json`
3. Push to trigger rebuild
4. Container will be automatically updated

## 🐛 Troubleshooting

### Container Keeps Restarting

Check logs:
```bash
docker logs pi-app
```

Common causes:
- Application crashes on startup
- Port conflicts
- Permission issues

### Cannot Access API

1. Check if container is running: `docker ps`
2. Check if port is exposed: `docker port pi-app`
3. Verify firewall settings on Raspberry Pi
4. Check application logs: `docker logs pi-app`

### GitHub Actions Runner Not Working

1. Check runner status: `sudo ./svc.sh status`
2. View runner logs: `cd actions-runner && cat _diag/Runner_*.log`
3. Reconfigure if needed: `./config.sh remove --token NEW_TOKEN`

### Build Failures

- Ensure Docker is running on Raspberry Pi
- Check GitHub Actions logs for specific errors
- Verify ARM64 platform compatibility

## 📝 License

This project is open source and available for educational purposes.

## 🎯 Technologies Used

- **Node.js 20**: Application runtime
- **Express.js**: Web framework
- **systeminformation**: System metrics library
- **Docker**: Containerization
- **GitHub Actions**: CI/CD pipeline
- **GitHub Container Registry**: Image storage
- **Raspberry Pi**: Deployment platform

## 🔮 Future Enhancements

- [ ] Add authentication/authorization
- [ ] Implement database (PostgreSQL/MySQL)
- [ ] Add API rate limiting
- [ ] Implement WebSocket support
- [ ] Add Prometheus metrics export
- [ ] Set up monitoring dashboard (Grafana)
- [ ] Add automated testing in CI/CD
- [ ] Implement blue-green deployments

## 📞 Support

For issues or questions, please open an issue in the GitHub repository.

