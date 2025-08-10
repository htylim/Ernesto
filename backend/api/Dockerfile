# Base stage with common setup
FROM python:3.12-slim as base

COPY . ./app
WORKDIR /app
RUN apt-get update && apt-get install -y locales postgresql-client && \
    sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && \
    locale-gen
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

# Production stage - global pip install (unchanged behavior)
FROM base as production
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt -r requirements.dev.txt
CMD ["flask", "run", "--host=0.0.0.0", "--port=8080"]

# Development stage - virtual environment for better tooling
FROM base as development
# Create virtual environment at stable path (not affected by volume mounts)
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt -r requirements.dev.txt

CMD ["sleep", "infinity"] 
