import os
import tensorflow as tf
import numpy as np
import json
from tensorflow.keras.preprocessing import image
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

CONFIDENCE_THRESHOLD = 0.50 # Umbral 50%

# Inicialización de Supabase: La variable global que debe ser None si falla
supabase: Union[Client, None] = None 

try:
    # Intenta importar y crear el cliente.
    from credenciales import SUPABASE_URL, SUPABASE_ANON_KEY
    supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    print("[INIT] Cliente Supabase cargado correctamente.")

except ImportError:
    # Si 'credenciales.py' no existe o la importación falla
    print("FATAL: No se encontró 'credenciales.py'. DB inactiva. El servidor continuará.")
    
except Exception as e:
    # Si las claves son incorrectas o hay un error de conexión
    print(f"FATAL: Error al inicializar Supabase: {e}. El servidor continuará.")


preprocess_fn = tf.keras.applications.mobilenet_v2.preprocess_input

# --- 2. FUNCIONES AUXILIARES ---
def get_labels(path):
    print(f"[DEBUG] Cargando etiquetas desde: {path}") # Log adicional
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return [line.strip() for line in f.readlines()]
    return None

def preprocess_image(image_data: bytes, target_size=IMG_SIZE):
    print(f"[DEBUG] Preprocesando imagen. Tamaño target: {target_size}") # Log adicional
    try:
        img = image.load_img(BytesIO(image_data), target_size=target_size)
    except Exception as e:
        raise ValueError(f"Error al cargar la imagen desde bytes: {e}")
    
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    processed_image = preprocess_fn(img_array)
    return processed_image.astype(np.float32)

def get_disponibilidad(cantidad: int) -> str:
    # No necesita más logs, es simple lógica.
    if cantidad <= 0:
        return "Sin stock"
    if cantidad <= 4:
        return "Baja disponibilidad"
    if cantidad <= 10:
        return "Disponibilidad media"
    return "Alta disponibilidad"

# --- 3. PREDICCIÓN IA ---
def predict_from_bytes(model_path, image_data: bytes, labels_path, threshold):
    print(f"[IA DEBUG] Iniciando predicción. Modelo: {model_path}") # Log adicional
    if not os.path.exists(model_path):
        return {'status': 'error', 'message': f'Archivo del modelo no encontrado: {model_path}'}

    try:
        interpreter = tf.lite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()
        print("[IA DEBUG] Modelo TFLite cargado y tensores asignados.") # Log adicional
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
    
    print(f"[IA DEBUG] Clase predicha: {predicted_label}, Confianza: {confidence}") # Log adicional

    return {
        'status': 'success',
        'predicted_label': predicted_label,
        'confidence': float(confidence),
        'confidence_score': f"{confidence * 100:.2f}%",
        'threshold_met': bool(confidence >= threshold),
    }

# --- 4. REGISTRO EN SUPABASE (Ajustado para usar 'stock' como fuente de verdad) ---
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
):
    print(f"\n[INICIO] Procesando producto: {codigo_barras}")
    current_time = datetime.now().isoformat()

    if supabase is None:
        return {'status': 'error', 'message': 'El servicio de base de datos Supabase no está inicializado.'}

    # 1️⃣ Decodificar Base64 (Mantenido)
    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception as e:
        return {'status': 'error', 'message': f"Error al decodificar Base64: {e}"}

    file_name = f"{uuid.uuid4()}.jpeg"
    storage_path = f"imagenes/{file_name}"

    # 2️⃣ Clasificar con IA (Mantenido)
    prediction_result = predict_from_bytes(MODEL_PATH, image_bytes, LABELS_PATH, CONFIDENCE_THRESHOLD)
    if prediction_result['status'] == 'error':
        return {'status': 'error', 'message': prediction_result['message']}

    estado_producto = prediction_result['predicted_label'].lower()
    print(f"[IA] Estado clasificado: **{estado_producto}**")

    # 3️⃣ Subir imagen a Supabase Storage (Mantenido)
    # **NOTA:** Asegúrate de que los permisos de Storage (RLS) permitan la subida.
    try:
        response_upload = supabase.storage.from_("imagenes").upload(
            file=image_bytes,
            path=file_name,
            file_options={"content-type": "image/jpeg"}
        )
        if hasattr(response_upload, 'error') and response_upload.error:
             # Manejo de error de RLS de Storage
             return {'status': 'error', 'message': f"Error al subir imagen (Storage RLS): {response_upload.error.message}"}

        print(f"[STORAGE] Imagen subida a: {storage_path}")
    except Exception as e:
        return {'status': 'error', 'message': f"Excepción al subir imagen: {e}"}


    # 4️⃣ Consultar Producto Existente
    print("[DB] Consultando producto existente...")
    cat_id_int = int(categoria_id) if categoria_id and str(categoria_id).isdigit() else None

    try:
        # Solo necesitamos el ID del producto
        response_prod = supabase.table('productos').select('id').eq('codigo_barras', codigo_barras).maybe_single().execute()
        response_prod_data = response_prod.data if response_prod and hasattr(response_prod, "data") else None
    except Exception as e:
        return {'status': 'error', 'message': f"Error al consultar producto: {e}"}

    producto_id = None

    if response_prod_data:
        # Producto existente: obtiene el ID.
        producto_id = response_prod_data['id']
        print(f"[DB] Producto existente ID: {producto_id}")

        # **Importante:** Actualizamos el estado del producto en 'productos' con la clasificación IA
        update_prod_data = {
            'estado': estado_producto,
            'updated_at': current_time
        }
        supabase.table('productos').update(update_prod_data).eq('id', producto_id).execute()

    else:
        # Producto nuevo: inserta y obtiene el ID.
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
            'estado': estado_producto,
            'disponibilidad': 'Baja disponibilidad', # Stock inicial 1
            'unidad': 1, # Stock total inicializado a 1 (por si se consulta esta tabla)
            'created_at': current_time,
            'updated_at': current_time
        }

        response = supabase.table('productos').insert(insert_data).execute()
        if response.error:
            return {'status': 'error', 'message': f"Fallo al insertar producto: {response.error.message}"}

        producto_id = response.data[0]['id']
        print(f"[DB] Inserción exitosa. Nuevo Producto ID: {producto_id}")


    # 5️⃣ Gestionar Stock Total en la tabla 'stock' (CORRECCIÓN CRÍTICA)
    
    # 5a. Consultar stock actual
    try:
        response_stock = supabase.table('stock').select('cantidad').eq('producto_id', producto_id).maybe_single().execute()
        stock_data = response_stock.data if response_stock and hasattr(response_stock, "data") else None
    except Exception as e:
        return {'status': 'error', 'message': f"Error al consultar stock: {e}"}

    new_stock_total = 1
    
    if stock_data:
        # Stock existente: Actualizar (Sumar 1)
        current_stock = stock_data.get('cantidad', 0)
        new_stock_total = current_stock + 1
        print(f"[DB] Stock existente. Actualizando cantidad: {current_stock} -> {new_stock_total}")

        update_stock_data = {
            'cantidad': new_stock_total,
            'ultima_actualizacion': current_time,
            'disponibilidad': get_disponibilidad(new_stock_total),
            'estado': estado_producto,
            'updated_at': current_time
        }
        
        response = supabase.table('stock').update(update_stock_data).eq('producto_id', producto_id).execute()
        if response.error:
            return {'status': 'error', 'message': f"Fallo al actualizar stock: {response.error.message}"}

    else:
        # Stock nuevo: Insertar (Cantidad 1)
        print("[DB] No existe registro de stock. Insertando nuevo registro.")
        insert_stock_data = {
            'producto_id': producto_id,
            'cantidad': new_stock_total,
            'ultima_actualizacion': current_time,
            'disponibilidad': get_disponibilidad(new_stock_total),
            'estado': estado_producto,
            'created_at': current_time,
            'updated_at': current_time
        }

        response = supabase.table('stock').insert(insert_stock_data).execute()
        if response.error:
            return {'status': 'error', 'message': f"Fallo al insertar stock: {response.error.message}"}
        
    # **NOTA:** Si usaste 'unidad' en 'productos', podrías querer actualizarlo aquí también para mantener la coherencia.
    supabase.table('productos').update({'unidad': new_stock_total, 'disponibilidad': get_disponibilidad(new_stock_total)}).eq('id', producto_id).execute()


    # 6️⃣ Registrar imagen en 'imagenes' (Mantenido, asume que 'producto_id' es ahora int8)
    image_data_to_insert = {
        'producto_id': producto_id,
        'storage_path': storage_path,
        'ancho': ancho,
        'alto': alto,
        'tomado_en': current_time,
        'tomado_por': user_email,
    }
    
    response_img = supabase.table('imagenes').insert(image_data_to_insert).execute()

    if response_img.error:
        # Asegúrate de que las políticas RLS de la tabla 'imagenes' permitan la inserción
        return {'status': 'error', 'message': f"Error al insertar en tabla 'imagenes': {response_img.error.message}"}
    
    print("[DB] Registro de imagen exitoso.")
    return {
        'status': 'success',
        'message': 'Producto, stock e imagen registrados.',
        'producto_id': producto_id,
        'estado_clasificado': estado_producto,
        'stock_actual': new_stock_total
    }