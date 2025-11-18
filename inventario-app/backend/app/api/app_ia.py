import os
import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image
from supabase import create_client, Client
from datetime import datetime
from io import BytesIO
import base64
import uuid
from typing import Optional, Union

# ------------------------------
# CONFIG
# ------------------------------
IMG_SIZE = (224, 224)

# ------------------------------
# INICIALIZAR SUPABASE
# ------------------------------

supabase: Union[Client, None] = None
try:
    # IMPORT CORRECTO SEGÚN TU ESTRUCTURA:
    # backend/app/api/credenciales.py
    from app.api.credenciales import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    print("[INIT] Supabase listo.")

except Exception as e:
    print(f"[ERROR INIT] Supabase no inicializado: {e}")
    supabase = None


# ------------------------------
# CARGAR MODELO IA
# ------------------------------

MODEL_PATH = os.path.join(os.path.dirname(__file__), "modelo_entrenado.h5")

try:
    model = tf.keras.models.load_model(MODEL_PATH)
    print("[INIT] Modelo IA cargado correctamente.")
except Exception as e:
    print(f"[ERROR MODEL] No se pudo cargar el modelo IA: {e}")
    model = None


# ------------------------------
# PROCESAR IMAGEN (BASE64)
# ------------------------------

def preprocess_image(image_base64: str):
    """
    Convierte imagen Base64 → Tensores para el modelo IA.
    """
    try:
        header, data = image_base64.split(";base64,")
        img_data = base64.b64decode(data)
        img = tf.image.decode_image(img_data, channels=3)
        img = tf.image.resize(img, IMG_SIZE)
        img = img / 255.0
        return np.expand_dims(img, axis=0)
    except Exception as e:
        print(f"[ERROR IMG] No se pudo procesar la imagen: {e}")
        return None


# ------------------------------
# PREDICCIÓN DEL MODELO IA
# ------------------------------

def analyze_image(image_base64: str):
    """
    Recibe imagen Base64 → analiza con IA → retorna información del producto.
    """
    if supabase is None:
        return {"error": "Supabase no inicializado."}

    if model is None:
        return {"error": "Modelo IA no cargado."}

    processed_img = preprocess_image(image_base64)
    if processed_img is None:
        return {"error": "Error al procesar la imagen."}

    try:
        predictions = model.predict(processed_img)
        predicted_class = np.argmax(predictions)

        # Etiquetas de ejemplo — AJÚSTALAS SEGÚN TU MODELO
        labels = ["monitor", "celular", "parlante", "teclado"]
        label = labels[predicted_class]

        return {
            "categoria": label,
            "confidence": float(np.max(predictions)),
        }

    except Exception as e:
        print(f"[ERROR PREDICT] {e}")
        return {"error": "Error al ejecutar predicción de IA."}


# ------------------------------
# GUARDAR IMAGEN EN SUPABASE STORAGE
# ------------------------------

def save_image_in_storage(image_base64: str):
    """
    Guarda imagen en Supabase Storage.
    Retorna URL pública.
    """
    if supabase is None:
        return {"error": "Supabase no inicializado."}

    try:
        header, data = image_base64.split(";base64,")
        img_bytes = base64.b64decode(data)

        file_name = f"{uuid.uuid4()}.jpg"

        result = supabase.storage.from_("imagenes_productos").upload(
            file_name,
            img_bytes,
            {"content-type": "image/jpeg"}
        )

        if "error" in result:
            return {"error": result["error"]["message"]}

        public_url = supabase.storage.from_("imagenes_productos").get_public_url(file_name)

        return {"url": public_url}

    except Exception as e:
        print(f"[ERROR STORAGE] {e}")
        return {"error": "No se pudo guardar la imagen en Storage."}


# ------------------------------
# PROCESAR PRODUCTO COMPLETO
# ------------------------------

def procesar_producto_con_ia(image_base64: str):
    """
    Analiza imagen + guarda foto + retorna datos.
    Usado por el frontend.
    """
    print("[INFO] Procesando producto con IA...")

    analysis = analyze_image(image_base64)
    if "error" in analysis:
        return analysis

    storage = save_image_in_storage(image_base64)
    if "error" in storage:
        return storage

    return {
        "status": "ok",
        "categoria_detectada": analysis["categoria"],
        "confidence": analysis["confidence"],
        "url_imagen": storage["url"],
    }
