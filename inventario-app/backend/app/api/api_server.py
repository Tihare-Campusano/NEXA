# /backend/app/api/api_server.py
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from api.app_ia import registrar_producto_y_imagen

app = FastAPI()

origins = [
    "*",
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8100",
    "http://127.0.0.1",
    "capacitor://localhost",
    "http://localhost",
    "https://inventario-ia-api-887072391939.us-central1.run.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Para mobile siempre * (seguro si tu API no es pública)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- MODELO (limpio, acepta extras) ---
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
        extra = "allow"   # permitimos campos extras (no rompe si frontend envía más)

# --- ENDPOINT ---
@app.post("/api/clasificar-producto")
async def classify_product_endpoint(request: ClassificationRequest):
    # Opcional: log de lo que llega (útil para debugear)
    print("[API] Request recibido:", request.model_dump(exclude_none=True))

    try:
        # Ejecutar la función síncrona en un thread para no bloquear el event-loop
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
        # Devolvemos detalle para la consola; el frontend verá 500 y el texto
        raise HTTPException(status_code=500, detail=f"Error interno del servidor IA: {e}")

    # Si la función devolvió un objeto de error (estatus 'error'), lo transformamos a 400
    if isinstance(result, dict) and result.get("status") == "error":
        print("[API] Resultado de app_ia con status=error:", result.get("message"))
        raise HTTPException(status_code=400, detail=result.get("message"))

    return result

@app.get("/")
def root():
    return {"status": "ok", "message": "API funcionando correctamente."}