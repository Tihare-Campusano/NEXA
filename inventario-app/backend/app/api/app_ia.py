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

# --- 1. CONFIGURACIÓN ---
IMG_SIZE = (224, 224)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "modelo_ia")
MODEL_PATH = os.path.join(MODEL_DIR, "modelo_final_v3.tflite")
LABELS_PATH = os.path.join(MODEL_DIR, "labels.txt")
CONFIDENCE_THRESHOLD = 0.50  # Umbral mínimo de confianza

# --- 2. CONEXIÓN SUPABASE ---
supabase: Union[Client, None] = None
try:
    from credenciales import SUPABASE_URL, SUPABASE_ANON_KEY
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    print("[INIT] Supabase conectado correctamente.")
except Exception as e:
    print(f"[ERROR INIT] No se pudo inicializar Supabase: {e}")
    supabase = None

# --- 3. FUNCIONES AUXILIARES ---
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

# --- 4. PREDICCIÓN CON IA ---
def predict_from_bytes(model_path, image_data: bytes, labels_path, threshold):
    if not os.path.exists(model_path):
        return {'status': 'error', 'message': f'Modelo no encontrado en: {model_path}'}

    try:
        interpreter = tf.lite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()
    except Exception as e:
        return {'status': 'error', 'message': f"Error al cargar modelo: {e}"}

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    processed_image = preprocess_image(image_data)
    interpreter.set_tensor(input_details[0]['index'], processed_image)
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
        'confidence_score': f"{confidence * 100:.2f}%",
    }

# --- 5. REGISTRO EN SUPABASE ---
async def registrar_producto_y_imagen(
    image_base64: str,
    codigo_barras: str,
    nombre: Optional[str] = None,
    marca: Optional[str] = None,
    modelo: Optional[str] = None,
    categoria_id: Optional[str] = None,
    compatibilidad: Optional[str] = None,
    observaciones: Optional[str] = None,
):
    print(f"[START] Procesando producto: {codigo_barras}")
    current_time = datetime.now().isoformat()

    if supabase is None:
        return {'status': 'error', 'message': 'Supabase no está inicializado.'}

    # --- 1️⃣ Decodificar imagen ---
    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception as e:
        return {'status': 'error', 'message': f"Error al decodificar imagen: {e}"}

    # --- 2️⃣ Clasificación IA ---
    prediction = predict_from_bytes(MODEL_PATH, image_bytes, LABELS_PATH, CONFIDENCE_THRESHOLD)
    if prediction['status'] == 'error':
        return prediction

    estado_producto = prediction['predicted_label'].lower()
    print(f"[IA] Estado IA: {estado_producto}")

    # --- 3️⃣ Subir imagen al bucket 'imagenes' ---
    file_name = f"{uuid.uuid4()}.jpeg"
    try:
        supabase.storage.from_("imagenes").upload(
            file=image_bytes,
            path=file_name,
            file_options={"content-type": "image/jpeg"},
        )
        print(f"[STORAGE] Imagen subida correctamente: imagenes/{file_name}")
    except Exception as e:
        return {'status': 'error', 'message': f"Error al subir imagen: {e}"}

    # --- 4️⃣ Buscar o crear producto ---
    try:
        existing = supabase.table('productos').select('*').eq('codigo_barras', codigo_barras).maybe_single().execute()
        data = existing.data if existing and hasattr(existing, "data") else None
    except Exception as e:
        return {'status': 'error', 'message': f"Error al consultar producto: {e}"}

    stock_nuevo = 1
    if data:
        # Producto existente → actualizar stock
        producto_id = data['id']
        stock_actual = int(data.get('stock', 0))
        stock_nuevo = stock_actual + 1
        print(f"[DB] Producto existente. Nuevo stock: {stock_nuevo}")

        update_data = {
            'stock': stock_nuevo,
            'disponibilidad': get_disponibilidad(stock_nuevo),
            'estado': estado_producto,
            'updated_at': current_time,
        }
        supabase.table('productos').update(update_data).eq('id', producto_id).execute()
    else:
        # Producto nuevo → insertar
        print("[DB] Insertando producto nuevo...")
        insert_data = {
            'codigo_barras': codigo_barras,
            'nombre': nombre or 'Producto sin nombre',
            'marca': marca or 'Desconocida',
            'modelo': modelo or 'N/A',
            'compatibilidad': compatibilidad,
            'categoria_id': int(categoria_id) if categoria_id and str(categoria_id).isdigit() else None,
            'activo': True,
            'observaciones': observaciones,
            'stock': stock_nuevo,
            'estado': estado_producto,
            'disponibilidad': get_disponibilidad(stock_nuevo),
            'created_at': current_time,
            'updated_at': current_time,
        }
        response = supabase.table('productos').insert(insert_data).execute()
        producto_id = response.data[0]['id']

    # --- ✅ Resultado final ---
    return {
        'status': 'success',
        'message': 'Producto registrado correctamente.',
        'producto_id': producto_id,
        'estado': estado_producto,
        'stock': stock_nuevo,
    }
