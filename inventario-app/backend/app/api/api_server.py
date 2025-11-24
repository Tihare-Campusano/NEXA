# /backend/app/api/api_server.py
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

# Import correcto según estructura real
from api.app_ia import registrar_producto_y_imagen

app = FastAPI()

# -----------------------
# CORS FULL (para desarrollo; en producción restringir los orígenes)
# -----------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # durante desarrollo está bien; en prod poner orígenes explícitos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------
# Modelo de request
# -----------------------
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
        extra = "allow"


# -----------------------
# ENDPOINT PRINCIPAL
# -----------------------
@app.post("/api/clasificar-producto")
async def classify_product_endpoint(request: ClassificationRequest):
    """
    Recibe la imagen base64 + metadatos y delega en registrar_producto_y_imagen.
    Devuelve el resultado tal cual lo produce esa función.
    """
    print("[API] Request recibido:", request.model_dump(exclude_none=True))

    try:
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
        print("[API ERROR]", repr(e))
        raise HTTPException(status_code=500, detail=f"Error interno: {e}")

    # registrar_producto_y_imagen devuelve dict con "status": "ok" o "status": "error"
    if isinstance(result, dict) and result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))

    return result


@app.get("/")
def root():
    return {"status": "ok", "message": "API funcionando correctamente."}