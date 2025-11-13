# /backend/app/api/api_server.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from api.app_ia import registrar_producto_y_imagen

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8100",
    "https://inventario-ia-api-887072391939.us-central1.run.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELO LIMPIO ---
class ClassificationRequest(BaseModel):
    image_base64: str
    codigo_barras: str

    # Datos opcionales del formulario
    nombre: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    categoria_id: Optional[str] = None
    compatibilidad: Optional[str] = None
    observaciones: Optional[str] = None

    class Config:
        extra = "ignore"   # Ignora cualquier campo basura que llegue

# --- ENDPOINT ---
@app.post("/api/clasificar-producto")
async def classify_product_endpoint(request: ClassificationRequest):

    try:
        result = await registrar_producto_y_imagen(
            request.image_base64,
            request.codigo_barras,
            request.nombre,
            request.marca,
            request.modelo,
            request.categoria_id,
            request.compatibilidad,
            request.observaciones,
        )

    except Exception as e:
        print("Error backend:", e)
        raise HTTPException(status_code=500, detail=f"Error interno del servidor IA: {e}")

    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))

    return result

@app.get("/")
def root():
    return {"status": "ok", "message": "API funcionando correctamente."}
