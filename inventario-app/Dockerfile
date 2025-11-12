# Esta es la imagen base optimizada para FastAPI, que incluye Gunicorn y Uvicorn
# ya configurados y resuelve los problemas de rutas (PYTHONPATH) que tuvimos.
FROM tiangolo/uvicorn-gunicorn-fastapi:python3.11

# 2. Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app

# 3. Copiar e instalar las dependencias
# Instala las librerías necesarias para tu aplicación (TensorFlow, Supabase, etc.)
# Nota: La imagen base ya trae FastAPI, Uvicorn y Gunicorn.
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copiar los archivos de la aplicación (código, credenciales y modelos)
# Esto copia la carpeta 'api' (que contiene api_server.py, app_ia.py, credenciales.py, y modelo_ia)
COPY backend/app /app

# 5. Configuración de Inicio
# La imagen base lee estas variables para saber qué archivo Python y qué objeto iniciar.
# api.api_server es el módulo, y app es el objeto FastAPI.
ENV MODULE_NAME="api.api_server"
ENV VARIABLE_NAME="app"

# 6. Exponer el puerto
EXPOSE 80
# El comando de inicio (Gunicorn con workers) es manejado internamente por la imagen base.