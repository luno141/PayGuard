FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy project specification & dependencies
COPY pyproject.toml README.md Makefile ./
COPY api/ api/
COPY ml/ ml/
COPY models/ models/
COPY tests/ tests/

# Install PayGuard & dependencies (including LightGBM runtime)
RUN pip install --no-cache-dir -e '.[dev]'

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
