FROM tiangolo/uvicorn-gunicorn-fastapi:python3.11

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app /app

ENV MODULE_NAME="api.api_server"
ENV VARIABLE_NAME="app"

EXPOSE 80