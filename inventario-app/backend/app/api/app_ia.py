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
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "modelo_ia")
MODEL_PATH = os.path.join(MODEL_DIR, "modelo_final_v3.tflite")
LABELS_PATH = os.path.join(MODEL_DIR, "labels.txt")
CONFIDENCE_THRESHOLD = 0.50

supabase: Union[Client, None] = None
try:
    from credenciales import SUPABASE_URL, SUPABASE_ANON_KEY
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    print("[INIT] Supabase listo.")
except Exception as e:
    print(f"[ERROR INIT] Supabase no inicializado: {e}")
    supabase = None


# ------------------------------
# UTILS
# ------------------------------
def get_labels(path):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return [line.strip() for line in f.readlines()]
    return None


def preprocess_image(image_data: bytes, target_size=IMG_SIZE):
    img = image.load_img(BytesIO(image_data), target_size=target_size)
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    return tf.keras.applications.mobilenet_v2.preprocess_input(img_array).astype(np.float32)


def get_disponibilidad(cantidad: int) -> str:
    if cantidad <= 0:
        return "Sin stock"
    if cantidad <= 4:
        return "Baja disponibilidad"
    if cantidad <= 10:
        return "Disponibilidad media"
    return "Alta disponibilidad"


# ------------------------------
# IA PREDICTION
# ------------------------------
def predict_from_bytes(model_path, image_data: bytes, labels_path, threshold):
    if not os.path.exists(model_path):
        return {'status': 'error', 'message': f'Modelo no encontrado: {model_path}'}

    interpreter = tf.lite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()

    input_tensor = preprocess_image(image_data)
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    interpreter.set_tensor(input_details[0]['index'], input_tensor)
    interpreter.invoke()

    output_data = interpreter.get_tensor(output_details[0]['index'])
    probabilities = output_data[0]

    labels = get_labels(labels_path)
    if not labels:
        return {'status': 'error', 'message': 'No se pudieron cargar las etiquetas.'}

    idx = np.argmax(probabilities)
    confidence = probabilities[idx]

    label = labels[idx] if confidence >= threshold else "INCIERTO"

    return {
        'status': 'success',
        'predicted_label': label,
        'confidence': float(confidence),
        'confidence_score': f"{confidence * 100:.2f}%"
    }


# ------------------------------
# FUNCIÓN PRINCIPAL
# ------------------------------
def registrar_producto_y_imagen(
    image_base64: str,
    codigo_barras: str,
    nombre: Optional[str] = None,
    marca: Optional[str] = None,
    modelo: Optional[str] = None,
    categoria_id: Optional[str] = None,
    compatibilidad: Optional[str] = None,
    observaciones: Optional[str] = None,
):
    print(f"[START] Procesando código: {codigo_barras}")
    current_time = datetime.now().isoformat()

    if supabase is None:
        return {'status': 'error', 'message': 'Supabase no inicializado.'}

    if not codigo_barras:
        return {'status': 'error', 'message': 'El código de barras es obligatorio.'}

    # ------------------------------
    # 1) Decodificar imagen
    # ------------------------------
    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception as e:
        return {'status': 'error', 'message': f"Error decodificando imagen: {e}"}

    # ------------------------------
    # 2) Clasificación IA
    # ------------------------------
    prediction = predict_from_bytes(MODEL_PATH, image_bytes, LABELS_PATH, CONFIDENCE_THRESHOLD)
    if prediction["status"] == "error":
        return prediction

    estado_ia = prediction["predicted_label"].lower()

    # ------------------------------
    # 3) Subir imagen al Storage
    # ------------------------------
    # 3) Subir imagen al Storage + obtener URL pública
    file_name = f"{uuid.uuid4()}.jpeg"
    bucket = supabase.storage.from_("imagenes")

    try:
        bucket.upload(
            file_name,
            image_bytes,
            {"content-type": "image/jpeg"}
        )
    except Exception as e:
        return {'status': 'error', 'message': f"Error subiendo imagen: {e}"}

    # Obtener URL pública
    try:
        public_url = bucket.get_public_url(file_name)
    except Exception as e:
        return {"status": "error", "message": f"Error obteniendo URL pública: {e}"}
    
    # ------------------------------
    # 4) Buscar por código de barras (corregido)
    # ------------------------------
    try:
        result = (
            supabase.table("productos")
            .select("*")
            .eq("codigo_barras", codigo_barras)
            .maybe_single()
            .execute()
        )
    except Exception as e:
        return {"status": "error", "message": f"Error buscando producto por código: {e}"}

    producto = result.data if result and hasattr(result, "data") and isinstance(result.data, dict) else None

    # Si existe → actualizar stock
    if producto:
        stock_nuevo = producto["stock"] + 1
        supabase.table("productos").update({
            "stock": stock_nuevo,
            "disponibilidad": get_disponibilidad(stock_nuevo),
            "estado": estado_ia,
            "updated_at": current_time,
            "imagen_url": public_url
        }).eq("id", producto["id"]).execute()

        return {
            "status": "success",
            "message": "Stock actualizado (coincidencia código de barras).",
            "producto_id": producto["id"],
            "estado_clasificado": estado_ia,
            "stock_actual": stock_nuevo
        }

    # ------------------------------
    # 5) Buscar coincidencia nombre+marca+modelo
    # ------------------------------
    try:
        result2 = (
            supabase.table("productos")
            .select("*")
            .match({
                "nombre": nombre,
                "marca": marca,
                "modelo": modelo
            })
            .maybe_single()
            .execute()
        )
        producto2 = result2.data if result2 and isinstance(result2.data, dict) else None
    except Exception:
        producto2 = None

    if producto2:
        stock_nuevo = producto2["stock"] + 1
        supabase.table("productos").update({
            "stock": stock_nuevo,
            "disponibilidad": get_disponibilidad(stock_nuevo),
            "estado": estado_ia,
            "updated_at": current_time,
            "imagen_url": public_url
        }).eq("id", producto2["id"]).execute()

        return {
            "status": "success",
            "message": "Stock actualizado (coincidencia nombre/marca/modelo).",
            "producto_id": producto2["id"],
            "estado_clasificado": estado_ia,
            "stock_actual": stock_nuevo
        }

    # ------------------------------
    # 6) Registrar producto nuevo
    # ------------------------------
    nuevo = supabase.table("productos").insert({
        "codigo_barras": codigo_barras,
        "nombre": nombre,
        "marca": marca,
        "modelo": modelo,
        "compatibilidad": compatibilidad,
        "categoria_id": int(categoria_id) if categoria_id and str(categoria_id).isdigit() else None,
        "observaciones": observaciones,
        "stock": 1,
        "estado": estado_ia,
        "disponibilidad": get_disponibilidad(1),
        "created_at": current_time,
        "updated_at": current_time,
        "imagen_url": public_url
    }).execute()

    return {
        "status": "success",
        "message": "Producto nuevo registrado.",
        "producto_id": nuevo.data[0]["id"],
        "estado_clasificado": estado_ia,
        "stock_actual": 1,
        "imagen_url": public_url
    }
