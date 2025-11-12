# /backend/app/api/api_server.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import asyncio
from typing import Optional, Any # Incluimos Any para flexibilidad si es necesario

# Importa la función principal de tu script de IA
# Asegúrate de que app_ia.py (o el archivo que contiene la función) esté correctamente importado.
from api.app_ia import registrar_producto_y_imagen # Asumiendo que es app_ia.py

# --- Configuración de FastAPI ---
app = FastAPI()

# ⚠️ PASO 2: CONFIGURACIÓN CORS
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8100", # Origen local Ionic/Capacitor
    # URL de Cloud Run, necesaria para el propio servidor si hace peticiones a sí mismo o para claridad
    "https://inventario-ia-api-887072391939.us-central1.run.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# --- Modelo de Datos (Input) CORREGIDO Y ROBUSTO ---
class ClassificationRequest(BaseModel):
    # Campos obligatorios y principales
    image_base64: str
    codigo_barras: str
    user_email: str
    alto: int
    ancho: int
    
    # CAMPOS DEL FORMULARIO AÑADIDOS COMO OPCIONALES. 
    # Usamos Field con un valor por defecto para manejar None/cadenas vacías de forma segura.
    nombre: Optional[str] = Field(default=None)
    marca: Optional[str] = Field(default=None)
    modelo: Optional[str] = Field(default=None)
    categoria_id: Optional[str] = Field(default=None)
    compatibilidad: Optional[str] = Field(default=None)
    observaciones: Optional[str] = Field(default=None)
    
    # Aceptamos los campos que antes causaban error (stock, disponibilidad, estado)
    # y que el frontend sigue enviando, pero que la función registrar_producto_y_imagen ignora.
    stock: Optional[str] = Field(default=None)
    disponibilidad: Optional[str] = Field(default=None)
    estado: Optional[str] = Field(default=None)
    
    # Permitimos cualquier campo extra que el frontend pueda enviar sin causar un error de validación de Pydantic.
    # Nota: El uso de **kwargs en la función Python maneja esto también, pero es una buena práctica de Pydantic.
    class Config:
        extra = "allow" 

# --- Endpoint de la API ---

@app.post("/api/clasificar-producto")
async def classify_product_endpoint(request: ClassificationRequest):
    """
    Recibe la imagen y metadatos, llama a la función de IA/DB,
    y retorna el resultado de la clasificación.
    """
    
    # Usamos model_dump(exclude_none=True) para limpiar la solicitud de campos None
    # Esto es más seguro al pasarlo como **kwargs
    request_dict = request.model_dump(exclude_none=True, by_alias=True) 
    
    # 1. Llamada a la lógica central de IA/DB (registrar_producto_y_imagen)
    try:
        # Pasamos el diccionario completo, incluyendo los campos del formulario
        result = await registrar_producto_y_imagen(**request_dict)
    except Exception as e:
        # Captura cualquier error de Python no manejado (ej. FileNotFoundError, error de TFLite)
        print(f"Error interno al procesar la solicitud: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno del servidor de IA: {e}")

    # 2. Manejo de errores devueltos por la lógica de Supabase/IA (Errores de negocio/DB)
    if result.get('status') == 'error':
        print(f"Error de Supabase/IA: {result.get('message')}")
        # Los errores de DB/Lógica de negocio deben ser 400 (Bad Request)
        raise HTTPException(status_code=400, detail=result.get('message'))
        
    # 3. Retorna el resultado exitoso
    return result

# --- Ruta de Prueba/Salud (Opcional) ---
@app.get("/")
def read_root():
    return {"status": "ok", "message": "API de Clasificación de Productos funcionando."}