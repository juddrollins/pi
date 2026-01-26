# Makefile for Raspberry Pi API Server

# Variables
IMAGE_NAME = pi-app
CONTAINER_NAME = pi-app
PORT = 8080
VOLUME_NAME = pi-app-data

.PHONY: help build run stop logs clean test install dev shell restart

# Default target
help:
	@echo "Available targets:"
	@echo "  make build      - Build the Docker image"
	@echo "  make run         - Build and run the container"
	@echo "  make stop        - Stop the running container"
	@echo "  make logs        - View container logs"
	@echo "  make shell       - Open a shell in the running container"
	@echo "  make restart     - Restart the container"
	@echo "  make clean       - Stop and remove container and image"
	@echo "  make test        - Run API tests (requires container running)"
	@echo "  make install     - Install Node.js dependencies locally"
	@echo "  make dev         - Run the app locally (without Docker)"

# Build the Docker image
build:
	@echo "Building Docker image..."
	docker build -t $(IMAGE_NAME) .

# Run the container
run: build
	@echo "Starting container..."
	@docker stop $(CONTAINER_NAME) 2>/dev/null || true
	@docker rm $(CONTAINER_NAME) 2>/dev/null || true
	docker run -d \
		--name $(CONTAINER_NAME) \
		-p $(PORT):8080 \
		-v $(VOLUME_NAME):/app/data \
		$(IMAGE_NAME)
	@echo "Container started. Access API at http://localhost:$(PORT)"
	@echo "View logs with: make logs"

# Stop the container
stop:
	@echo "Stopping container..."
	docker stop $(CONTAINER_NAME) || true
	@echo "Container stopped"

# View container logs
logs:
	docker logs -f $(CONTAINER_NAME)

# View last N lines of logs (usage: make logs-tail N=50)
logs-tail:
	docker logs --tail $(N) $(CONTAINER_NAME)

# Open a shell in the running container
shell:
	docker exec -it $(CONTAINER_NAME) /bin/sh

# Restart the container
restart: stop run

# Clean up: stop and remove container and image
clean:
	@echo "Cleaning up..."
	docker stop $(CONTAINER_NAME) 2>/dev/null || true
	docker rm $(CONTAINER_NAME) 2>/dev/null || true
	docker rmi $(IMAGE_NAME) 2>/dev/null || true
	@echo "Cleanup complete"

# Test API endpoints (requires container to be running)
test:
	@echo "Testing API endpoints..."
	@echo "\n1. Testing root endpoint:"
	@curl -s http://localhost:$(PORT)/ | jq . || curl -s http://localhost:$(PORT)/
	@echo "\n\n2. Testing health endpoint:"
	@curl -s http://localhost:$(PORT)/health | jq . || curl -s http://localhost:$(PORT)/health
	@echo "\n\n3. Testing metrics endpoint:"
	@curl -s http://localhost:$(PORT)/metrics | jq . || curl -s http://localhost:$(PORT)/metrics
	@echo "\n\n4. Creating a test item:"
	@curl -s -X POST http://localhost:$(PORT)/api/items \
		-H "Content-Type: application/json" \
		-d '{"name": "Test Item", "description": "Created via Makefile"}' | jq . || \
		curl -s -X POST http://localhost:$(PORT)/api/items \
		-H "Content-Type: application/json" \
		-d '{"name": "Test Item", "description": "Created via Makefile"}'
	@echo "\n\n5. Getting all items:"
	@curl -s http://localhost:$(PORT)/api/items | jq . || curl -s http://localhost:$(PORT)/api/items
	@echo "\n"

# Install Node.js dependencies locally (for development)
install:
	@echo "Installing Node.js dependencies..."
	npm install

# Run the app locally without Docker (for development)
dev:
	@echo "Running app locally (development mode)..."
	npm start

# Check if container is running
status:
	@docker ps -a | grep $(CONTAINER_NAME) || echo "Container not found"

# View container resource usage
stats:
	docker stats $(CONTAINER_NAME) --no-stream

# Backup the data volume
backup:
	@echo "Backing up data volume..."
	@mkdir -p backups
	docker run --rm -v $(VOLUME_NAME):/data -v $(PWD)/backups:/backup alpine \
		tar czf /backup/pi-app-backup-$$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
	@echo "Backup created in ./backups/"

# Restore data volume from backup (usage: make restore BACKUP=backups/pi-app-backup-20240115-120000.tar.gz)
restore:
	@if [ -z "$(BACKUP)" ]; then \
		echo "Usage: make restore BACKUP=path/to/backup.tar.gz"; \
		exit 1; \
	fi
	@echo "Restoring from $(BACKUP)..."
	docker run --rm -v $(VOLUME_NAME):/data -v $(PWD):/backup alpine \
		tar xzf /backup/$(BACKUP) -C /data
	@echo "Restore complete"

