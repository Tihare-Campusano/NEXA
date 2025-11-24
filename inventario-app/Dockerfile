# Imagen base con FastAPI + Uvicorn + Gunicorn
FROM tiangolo/uvicorn-gunicorn-fastapi:python3.11

# Directorio dentro del contenedor
WORKDIR /app

# ------------------------------
# DEPENDENCIAS
# ------------------------------
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ------------------------------
# COPIAR APP COMPLETA
# ------------------------------
COPY backend/app /app

# ------------------------------
# COPIAR MODELO TFLITE Y LABELS (asegura que existan)
# ------------------------------
# (opcional si ya están dentro de backend/app, pero lo incluimos para garantizar la presencia)
COPY backend/app/api/modelo_ia/modelo_final_v3.tflite /app/api/modelo_ia/modelo_final_v3.tflite
COPY backend/app/api/modelo_ia/labels.txt /app/api/modelo_ia/labels.txt

# ------------------------------
# CONFIG DEL SERVIDOR
# ------------------------------
ENV MODULE_NAME="api.api_server"
ENV VARIABLE_NAME="app"

# Puerto para Cloud Run
EXPOSE 80