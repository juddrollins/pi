# Dockerfile
FROM python:3.14-slim

# Create unprivileged user
RUN useradd -m appuser
WORKDIR /app

# # Install deps
# COPY requirements.txt ./
# RUN pip install --no-cache-dir -r requirements.txt

# Copy code
COPY . .

USER appuser
CMD ["python", "index.py"]