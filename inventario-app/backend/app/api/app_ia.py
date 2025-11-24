# /backend/app/api/app_ia.py
import os
import tensorflow as tf
import numpy as np
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
    from .credenciales import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    print("[INIT] Supabase listo.")
except Exception as e:
    print(f"[ERROR INIT] Supabase no inicializado: {e}")
    supabase = None

# ------------------------------
# RUTAS MODELO Y LABELS
# ------------------------------
BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "modelo_ia", "modelo_final_v3.tflite")
LABELS_PATH = os.path.join(BASE_DIR, "labels.txt")

# ------------------------------
# CARGAR LABELS
# ------------------------------
labels = []
try:
    if os.path.exists(LABELS_PATH):
        with open(LABELS_PATH, "r", encoding="utf-8") as f:
            labels = [line.strip() for line in f.readlines() if line.strip()]
    else:
        print(f"[WARN] labels file not found at {LABELS_PATH}. Using default labels.")
except Exception as e:
    print(f"[ERROR LABELS] No se pudieron cargar labels: {e}")

# ------------------------------
# CARGAR MODELO IA TFLITE
# ------------------------------
interpreter = None
input_details = None
output_details = None

try:
    interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    print("[INIT] Modelo TFLite cargado correctamente:", MODEL_PATH)
    print("[INIT] Input details:", input_details)
    print("[INIT] Output details:", output_details)
except Exception as e:
    print(f"[ERROR MODEL] No se pudo cargar el modelo IA: {e}")
    interpreter = None

# ------------------------------
# PREPROCESAR IMAGEN
# ------------------------------
def preprocess_image(image_base64: str):
    try:
        header, data = image_base64.split(";base64,")
        img_data = base64.b64decode(data)

        # Decodificar con TF y redimensionar
        img = tf.image.decode_image(img_data, channels=3)
        img = tf.image.resize(img, IMG_SIZE)

        # Si tu entrenamiento usó MobileNetV2 preprocess_input, aplícalo:
        # mobilenet_v2.preprocess_input espera valores en rango [-1, 1]
        try:
            from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
            img = preprocess_input(img)  # convierte a float y normaliza como MobileNetV2
        except Exception:
            # fallback: normalizamos a [0,1]
            img = tf.cast(img, tf.float32) / 255.0

        # Expande la dimensión batch
        arr = np.expand_dims(img.numpy(), axis=0).astype(np.float32)

        # Asegurarse del dtype que el modelo espera
        if input_details:
            expected_dtype = np.dtype(input_details[0]['dtype'])
            if arr.dtype != expected_dtype:
                arr = arr.astype(expected_dtype)

        return arr

    except Exception as e:
        print(f"[ERROR IMG] {e}")
        return None

# ------------------------------
# PREDICCIÓN IA (RETORNA estado/clase)
# ------------------------------
def analyze_image(image_base64: str):
    if interpreter is None:
        return {"error": "Modelo IA no cargado."}

    img = preprocess_image(image_base64)
    if img is None:
        return {"error": "Error procesando imagen."}

    try:
        # Set input tensor
        interpreter.set_tensor(input_details[0]['index'], img)
        interpreter.invoke()

        # Get output
        output = interpreter.get_tensor(output_details[0]['index'])

        # Si output es logits o softmax, manejamos
        if output.ndim == 2:
            output = output[0]  # [1, n] -> [n]

        predicted_idx = int(np.argmax(output))
        confidence = float(np.max(output))

        # Etiqueta correspondiente (si labels están cargadas, úsalas)
        if labels and predicted_idx < len(labels):
            estado = labels[predicted_idx]
        else:
            # fallback: si no hay labels, devolver índice
            estado = str(predicted_idx)

        return {"estado_clasificado": estado, "confidence": confidence}

    except Exception as e:
        print(f"[ERROR PREDICT] {e}")
        return {"error": "Error ejecutando predicción IA."}

# ------------------------------
# GUARDAR IMAGEN EN SUPABASE
# ------------------------------
def save_image_in_storage(image_base64: str):
    if supabase is None:
        return {"error": "Supabase no inicializado."}

    try:
        header, data = image_base64.split(";base64,")
        img_bytes = base64.b64decode(data)

        file_name = f"{uuid.uuid4()}.jpg"

        res = supabase.storage.from_("imagenes_productos").upload(
            file_name,
            img_bytes,
            {"content-type": "image/jpeg"}
        )

        # supabase-python puede devolver un dict con 'error' o un objeto con .data; ajustamos defensivamente
        if isinstance(res, dict) and res.get("error"):
            return {"error": res["error"].get("message", "Error al subir imagen")}
        # obtener URL pública
        public = supabase.storage.from_("imagenes_productos").get_public_url(file_name)
        if isinstance(public, dict) and public.get("publicUrl"):
            public_url = public["publicUrl"]
        else:
            # algunos SDK devuelven un objeto con 'data' o 'publicURL'
            # intenta varias claves
            public_url = public.get("publicUrl") if isinstance(public, dict) else None
            if public_url is None:
                # fallback: construir manualmente si tu bucket es público:
                # No es ideal; mejor verificar retorno del SDK
                public_url = f"/storage/v1/object/public/imagenes_productos/{file_name}"

        return {"url": public_url}

    except Exception as e:
        print(f"[ERROR STORAGE] {e}")
        return {"error": "No se pudo guardar la imagen."}

# ------------------------------
# FUNCIÓN PRINCIPAL (LLAMADA POR API)
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
    imagen_url: Optional[str] = None
):
    """
    Procesa IA → guarda imagen → registra producto en Supabase y retorna respuesta lista para el frontend.
    """

    if supabase is None:
        return {"status": "error", "message": "Supabase no inicializado."}

    # 1) Analizar imagen con IA
    print("[IA] Analizando imagen...")
    ia_res = analyze_image(image_base64)
    if "error" in ia_res:
        return {"status": "error", "message": ia_res["error"]}

    # 2) Guardar imagen (si frontend no envío imagen_url pre-existente)
    print("[STORAGE] Guardando imagen...")
    storage_res = save_image_in_storage(image_base64)
    if "error" in storage_res:
        return {"status": "error", "message": storage_res["error"]}

    url_img = storage_res["url"]

    # 3) Preparar datos y guardar en Supabase
    print("[DB] Guardando producto en Supabase...")

    try:
        data = {
            "codigo_barras": codigo_barras,
            "nombre": nombre or "",
            "marca": marca or "",
            "modelo": modelo or "",
            # guardamos categoria_id si el frontend lo envía, sino dejamos el estado IA como categoria
            "categoria_id": categoria_id or None,
            "estado": ia_res.get("estado_clasificado"),
            "compatibilidad": compatibilidad or "",
            "observaciones": observaciones or "",
            "imagen_url": imagen_url or url_img,
            "confidence": ia_res.get("confidence"),
            "created_at": datetime.utcnow().isoformat()
        }

        insert = supabase.table("productos").insert(data).execute()

        # verificar insert
        if getattr(insert, "data", None) is None:
            # en algunos casos insert devuelve dict
            if isinstance(insert, dict) and insert.get("error"):
                return {"status": "error", "message": insert["error"].get("message", "Error al insertar")}
            # fallback minimal
            producto_data = None
        else:
            producto_data = insert.data[0]

        print("[OK] Producto registrado correctamente.")

        return {
            "status": "ok",
            "producto": producto_data,
            "url_imagen": imagen_url or url_img,
            "estado_clasificado": ia_res.get("estado_clasificado"),
            "confidence": ia_res.get("confidence")
        }

    except Exception as e:
        print("[DB ERROR]", e)
        return {"status": "error", "message": f"Error al insertar producto: {e}"}