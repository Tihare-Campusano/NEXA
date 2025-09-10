from fastapi import FastAPI, UploadFile, File
from app.services.ai_service import predict_image

app = FastAPI(title="Inventario API")

@app.get("/ping")
def ping():
    return {"msg": "Servidor activo 🚀"}

@app.post("/clasificar")
async def clasificar(file: UploadFile = File(...)):
    result = predict_image(await file.read())
    return {"estado": result}
