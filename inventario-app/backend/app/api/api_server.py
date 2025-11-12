# /backend/app/api/api_server.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from typing import Optional # 🛑 NECESARIO para campos que pueden ser None

# Importa la función principal de tu script de IA
# Asegúrate de que app_ia.py esté en la misma carpeta o sea accesible.
from api.app_ia import registrar_producto_y_imagen

# --- Configuración de FastAPI ---
app = FastAPI()

# ⚠️ PASO 2: CONFIGURACIÓN CORS (Se mantiene igual, es correcto)
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8100", 
    # Añadir URL de producción aquí
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# --- Modelo de Datos (Input) CORREGIDO ---
# Incluimos todos los campos opcionales del formulario del frontend
class ClassificationRequest(BaseModel):
    image_base64: str
    codigo_barras: str
    user_email: str
    alto: int
    ancho: int
    
    # 🛑 CAMPOS DEL FORMULARIO AÑADIDOS COMO OPCIONALES
    # Estos campos son los metadatos del producto que la IA necesita para el INSERT
    nombre: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    categoria_id: Optional[str] = None 
    compatibilidad: Optional[str] = None
    observaciones: Optional[str] = None 
    
    # Estos campos pueden venir del formulario pero el backend los sobreescribe, 
    # aun así, los aceptamos para evitar errores de validación de Pydantic.
    stock: Optional[str] = None 
    disponibilidad: Optional[str] = None
    estado: Optional[str] = None

# --- Endpoint de la API ---

@app.post("/api/clasificar-producto")
async def classify_product_endpoint(request: ClassificationRequest):
    """
    Recibe la imagen y metadatos, llama a la función de IA/DB en app_ia.py,
    y retorna el resultado de la clasificación.
    """
    
    # Convertimos la solicitud Pydantic en un diccionario para pasarlo a la función de lógica
    request_dict = request.model_dump() 
    
    # 1. Llamada a la lógica central de IA/DB (registrar_producto_y_imagen)
    try:
        # Pasamos el diccionario completo, incluyendo los campos del formulario
        result = await registrar_producto_y_imagen(**request_dict)
    except Exception as e:
        print(f"Error interno al procesar la solicitud: {e}")
        # Retorna el error 500 (Internal Server Error)
        raise HTTPException(status_code=500, detail=f"Error interno del servidor de IA: {e}")

    # 2. Manejo de errores devueltos por la lógica de Supabase/IA
    if result.get('status') == 'error':
        print(f"Error de Supabase/IA: {result.get('message')}")
        # Retorna un error 400 (Bad Request) que es el que el frontend estaba recibiendo
        raise HTTPException(status_code=400, detail=result.get('message'))
        
    # 3. Retorna el resultado exitoso
    return result

# --- Ruta de Prueba/Salud (Opcional) ---
@app.get("/")
def read_root():
    return {"status": "ok", "message": "API de Clasificación de Productos funcionando."}