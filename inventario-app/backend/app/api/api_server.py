# /backend/api_server.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
# Importa la función principal de tu script de IA
from app_ia import registrar_producto_y_imagen 

# --- Configuración de FastAPI ---
app = FastAPI()

# ⚠️ PASO 2: CONFIGURACIÓN CORS 
# Tu app Ionic/React se ejecuta probablemente en http://localhost:8100 (Ionic default) o 3000.
# Debes permitir estas fuentes para evitar el error CORS.

origins = [
    "http://localhost",
    "http://localhost:3000", # Puertos comunes de desarrollo React/Vite
    "http://localhost:8100", # Puerto común de desarrollo Ionic
    # 📢 ¡IMPORTANTE! Agrega aquí la URL de producción de tu aplicación Ionic
    # Ej: "https://tudominio.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos los métodos (POST, GET, etc.)
    allow_headers=["*"],
)

# --- Modelo de Datos (Input) ---
# Define la estructura de datos que esperas de tu frontend (ia-image.tsx)
class ClassificationRequest(BaseModel):
    image_base64: str
    codigo_barras: str
    user_email: str
    alto: int
    ancho: int

# --- Endpoint de la API ---

@app.post("/api/clasificar-producto")
async def classify_product_endpoint(request: ClassificationRequest):
    """
    Recibe la imagen y metadatos, llama a la función de IA/DB en app_ia.py,
    y retorna el resultado de la clasificación.
    """
    
    # 1. Llamada a la lógica central de IA/DB (registrar_producto_y_imagen)
    # Usamos request.dict() para convertir el modelo Pydantic en un diccionario
    try:
        result = await registrar_producto_y_imagen(**request.dict())
    except Exception as e:
        print(f"Error interno al procesar la solicitud: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor de IA: {e}")

    # 2. Manejo de errores devueltos por la lógica de Supabase/IA
    if result.get('status') == 'error':
        print(f"Error de Supabase/IA: {result.get('message')}")
        # Retorna un error 400 o 500 basado en el error de la lógica
        raise HTTPException(status_code=400, detail=result.get('message'))
        
    # 3. Retorna el resultado exitoso
    return result

# --- Ruta de Prueba/Salud (Opcional) ---
@app.get("/")
def read_root():
    return {"status": "ok", "message": "API de Clasificación de Productos funcionando."}