# /backend/app/api/api_server.py
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# ✅ IMPORT CORRECTO SEGÚN TU ESTRUCTURA
from api.app_ia import registrar_producto_y_imagen

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8100",
    "https://inventario-ia-api-887072391939.us-central1.run.app",

    # 📱 Necesario para aplicaciones móviles / tabletas
    "capacitor://localhost",
    "http://192.168.0.0/16",   # permite toda la red WiFi
    "http://127.0.0.1",
    "https://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],              # Permite todos los orígenes
    allow_credentials=False,          # Obligatorio si usas "*"
    allow_methods=["*"],              # GET, POST, OPTIONS…
    allow_headers=["*"],              # Content-Type, Authorization…
)

# --- MODELO ---
class ClassificationRequest(BaseModel):
    image_base64: str
    codigo_barras: str
    nombre: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    categoria_id: Optional[str] = None
    compatibilidad: Optional[str] = None
    observaciones: Optional[str] = None
    imagen_url: Optional[str] = None

    class Config:
        extra = "allow"   # permite campos extra sin romper


# --- ENDPOINT ---
@app.post("/api/clasificar-producto")
async def classify_product_endpoint(request: ClassificationRequest):

    print("[API] Request recibido:", request.model_dump(exclude_none=True))

    try:
        # Llama a la función del backend en un thread separado
        result = await asyncio.to_thread(
            registrar_producto_y_imagen,
            request.image_base64,
            request.codigo_barras,
            request.nombre,
            request.marca,
            request.modelo,
            request.categoria_id,
            request.compatibilidad,
            request.observaciones,
            request.imagen_url
        )

    except Exception as e:
        print("[API ERROR] Excepción al procesar IA/DB:", repr(e))
        raise HTTPException(status_code=500, detail=f"Error interno del servidor IA: {e}")

    if isinstance(result, dict) and result.get("status") == "error":
        print("[API] Resultado con error:", result.get("message"))
        raise HTTPException(status_code=400, detail=result.get("message"))

    return result


@app.get("/")
def root():
    return {"status": "ok", "message": "API funcionando correctamente."}