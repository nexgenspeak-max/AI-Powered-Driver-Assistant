FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

# Pre-download all model files (Silero VAD + turn-detector) into the image
# so the container starts instantly without downloading at runtime
RUN python -m app.main download-files

CMD ["python", "-m", "app.main", "start"]
