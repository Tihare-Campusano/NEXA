# 1. Imagen base de Python para rendimiento y tamaño
FROM python:3.11-slim

# CORRECCIÓN DE GUNICORN: Asegura que Python encuentre los ejecutables de pip.
ENV PYTHONPATH=/usr/local/lib/python3.11/site-packages

# 2. Establecer el directorio de trabajo
WORKDIR /app

# 3. Copiar y instalar las dependencias
# (Esto fuerza una reinstalación si cambias requirements.txt)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copiar los archivos de la aplicación (incluyendo el código corregido)
# Esto copiará api_server.py, app_ia.py, credenciales.py, y la carpeta modelo_ia
COPY backend/app /app

# 5. Comando de Producción Robusto con Gunicorn (Usando 'python -m' como solución robusta)
# Ejecuta 4 procesos worker, bindeado al puerto 80, con un timeout de 120s.
CMD ["python", "-m", "gunicorn", "api.api_server:app", "--bind", "0.0.0.0:80", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--timeout", "120"]

# 6. Exponer el puerto
EXPOSE 80