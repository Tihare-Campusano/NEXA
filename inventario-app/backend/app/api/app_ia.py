import os
import tensorflow as tf
import numpy as np
import json
from tensorflow.keras.preprocessing import image
# Usamos Union[Client, None] para tipar supabase correctamente
from supabase import create_client, Client
from datetime import datetime
from io import BytesIO
import base64
import uuid
import asyncio
from typing import Optional, Union 

# --- 1. CONFIGURACIÓN E INICIALIZACIÓN ---
IMG_SIZE = (224, 224)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_DIR = os.path.join(BASE_DIR, "modelo_ia") 
MODEL_PATH = os.path.join(MODEL_DIR, "modelo_final_v3.tflite")
LABELS_PATH = os.path.join(MODEL_DIR, "labels.txt")

CONFIDENCE_THRESHOLD = 0.50# Umbral 50%

# Inicialización de Supabase: La variable glpobal que debe ser None si falla
supabase: Union[Client, None] = None 

try:
    # Intenta importar y crear el cliente.
    from credenciales import SUPABASE_URL, SUPABASE_ANON_KEY
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    print("[INIT] Cliente Supabase cargado correctamente.")
    
except ImportError:
    # Esto ocurre si no se encuentra 'credenciales.py'
    print("FATAL: No se encontró 'credenciales.py'. DB inactiva. El servidor continuará.")
    
except Exception as e:
    # Esto ocurre si las claves son incorrectas o hay un error de conexión
    print(f"FATAL: Error al inicializar Supabase: {e}. El servidor continuará.")


preprocess_fn = tf.keras.applications.mobilenet_v2.preprocess_input

# --- 2. FUNCIONES AUXILIARES ---
def get_labels(path):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return [line.strip() for line in f.readlines()]
    return None

def preprocess_image(image_data: bytes, target_size=IMG_SIZE):
    try:
        img = image.load_img(BytesIO(image_data), target_size=target_size)
    except Exception as e:
        raise ValueError(f"Error al cargar la imagen desde bytes: {e}")
    
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    processed_image = preprocess_fn(img_array)
    return processed_image.astype(np.float32)

def get_disponibilidad(cantidad: int) -> str:
    if cantidad <= 0:
        return "Sin stock"
    if cantidad <= 4:
        return "Baja disponibilidad"
    if cantidad <= 10:
        return "Disponibilidad media"
    return "Alta disponibilidad"

# --- 3. PREDICCIÓN IA ---
def predict_from_bytes(model_path, image_data: bytes, labels_path, threshold):
    if not os.path.exists(model_path):
        return {'status': 'error', 'message': f'Archivo del modelo no encontrado: {model_path}'}

    try:
        interpreter = tf.lite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()
    except Exception as e:
        return {'status': 'error', 'message': f"Error al cargar modelo TFLite: {e}"}

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    try:
        processed_image = preprocess_image(image_data)
    except Exception as e:
        return {'status': 'error', 'message': str(e)}

    interpreter.set_tensor(input_details[0]['index'], processed_image)
    interpreter.invoke()

    output_data = interpreter.get_tensor(output_details[0]['index'])
    predictions = output_data

    labels = get_labels(labels_path)
    if not labels:
        return {'status': 'error', 'message': f"No se pudieron cargar las etiquetas desde '{labels_path}'."}

    if len(labels) != predictions.shape[1]:
        return {'status': 'error', 'message': f"Desajuste entre etiquetas ({len(labels)}) y salidas del modelo ({predictions.shape[1]})."}

    probabilities = predictions[0]
    predicted_class_index = np.argmax(probabilities)
    confidence = probabilities[predicted_class_index]
    predicted_label = labels[predicted_class_index] if confidence >= threshold else "INCIERTO"

    return {
        'status': 'success',
        'predicted_label': predicted_label,
        'confidence': float(confidence),
        'confidence_score': f"{confidence * 100:.2f}%",
        'threshold_met': bool(confidence >= threshold),
    }

# --- 4. REGISTRO EN SUPABASE (CORREGIDO PARA MANEJO DE NONE) ---
async def registrar_producto_y_imagen(
    image_base64: str, 
    codigo_barras: str, 
    user_email: str, 
    alto: int, 
    ancho: int,
    nombre: Optional[str] = None,
    marca: Optional[str] = None,
    modelo: Optional[str] = None,
    categoria_id: Optional[str] = None,
    compatibilidad: Optional[str] = None,
    observaciones: Optional[str] = None,
    stock: Optional[str] = None, 
    disponibilidad: Optional[str] = None,
    estado: Optional[str] = None
):
    print(f"\n[INICIO] Procesando producto: {codigo_barras}")
    current_time = datetime.now().isoformat()
    
    # NUEVA VERIFICACIÓN CRÍTICA: Asegurarse de que la DB esté disponible
    if supabase is None:
        return {'status': 'error', 'message': 'El servicio de base de datos Supabase no está inicializado. Error de configuración.'}
    
    # 1️⃣ Decodificar Base64
    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception as e:
        return {'status': 'error', 'message': f"Error al decodificar Base64: {e}"}
        
    file_name = f"{uuid.uuid4()}.jpeg"
    storage_path = f"imagenes/{file_name}"

    # 2️⃣ Clasificar con IA
    prediction_result = predict_from_bytes(MODEL_PATH, image_bytes, LABELS_PATH, CONFIDENCE_THRESHOLD)
    if prediction_result['status'] == 'error':
        print(f"[ERROR IA] {prediction_result['message']}")
        return {'status': 'error', 'message': prediction_result['message']}

    estado_producto = prediction_result['predicted_label'].lower()
    print(f"[IA] Estado clasificado: **{estado_producto}** con confianza de {prediction_result['confidence_score']}")

    # 3️⃣ Subir imagen a Supabase Storage
    try:
        supabase.storage.from_("imagenes").upload(
            file=image_bytes, 
            path=file_name,
            file_options={"content-type": "image/jpeg"}
        )
        print(f"[STORAGE] Imagen subida a: {storage_path}")
    except Exception as e:
        print(f"[ERROR STORAGE] Falló la subida de imagen: {e}")
        return {'status': 'error', 'message': f"Error al subir imagen: {e}"}

    # 4️⃣ Insertar o actualizar producto
    print("[DB] Consultando producto existente...")
    try:
        response_prod = supabase.table('productos').select('id, unidad').eq('codigo_barras', codigo_barras).maybe_single().execute()
        print(f"[DEBUG] Respuesta Supabase productos: {response_prod}")
    except Exception as e:
        return {'status': 'error', 'message': f"Error al consultar producto: {e}"}

    # 🧩 CORREGIDO: Manejo seguro si response_prod es None
    response_prod_data = None
    if response_prod and hasattr(response_prod, "data") and response_prod.data:
        response_prod_data = response_prod.data

    new_stock_value = 1
    producto_id = None
    cat_id_int = int(categoria_id) if categoria_id and categoria_id.isdigit() else None 

    if response_prod_data:
        # Producto existente
        current_stock = response_prod_data['unidad']
        producto_id = response_prod_data['id']
        new_stock_value = current_stock + 1

        update_data = {
            'unidad': new_stock_value,
            'estado': estado_producto,
            'disponibilidad': get_disponibilidad(new_stock_value)
        }

        response = supabase.table('productos').update(update_data).eq('id', producto_id).execute()
        if not response or not hasattr(response, "data") or not response.data:
            error_msg = getattr(response.error, "message", "Error desconocido en actualización") if hasattr(response, "error") else "Error desconocido"
            return {'status': 'error', 'message': f"Fallo al actualizar producto: {error_msg}"}

    else:
        # Producto nuevo
        print("[DB] Producto nuevo. Insertando...")

        insert_data = {
            'codigo_barras': codigo_barras,
            'nombre': nombre or 'PRODUCTO NUEVO - PENDIENTE',
            'marca': marca or 'N/A',
            'modelo': modelo or 'N/A',
            'compatibilidad': compatibilidad or None,
            'categoria_id': cat_id_int,
            'activo': True,
            'observaciones': observaciones or None,
            'unidad': new_stock_value,
            'estado': estado_producto,
            'disponibilidad': get_disponibilidad(new_stock_value)
        }

        response = supabase.table('productos').insert(insert_data).execute()
        if not response or not hasattr(response, "data") or not response.data:
            error_msg = getattr(response.error, "message", "Error desconocido en inserción") if hasattr(response, "error") else "Error desconocido"
            return {'status': 'error', 'message': f"Fallo al insertar producto: {error_msg}"}

        producto_id = response.data[0]['id']

    # 5️⃣ Registrar imagen
    image_data_to_insert = {
        'producto_id': producto_id,
        'storage_path': storage_path,
        'ancho': ancho,
        'alto': alto,
        'fecha_captura': current_time,
        'correo_captura': user_email,
    }

    response_img = supabase.table('imagenes').insert(image_data_to_insert).execute()
    if response_img and hasattr(response_img, "data") and response_img.data:
        print("[DB] Registro de imagen exitoso.")
        return {
            'status': 'success',
            'message': 'Producto, stock e imagen registrados.',
            'producto_id': producto_id,
            'estado_clasificado': estado_producto,
            'stock_actual': new_stock_value
        }
    else:
        return {'status': 'error', 'message': "Error al insertar en tabla 'imagenes'."}