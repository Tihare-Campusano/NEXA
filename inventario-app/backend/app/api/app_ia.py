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
from typing import Optional, Union, Any

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
    
    # AÑADIDO: Verificación explícita de la ruta (útil para Docker)
    if not os.path.exists(model_path):
        print(f"[ERROR CRÍTICO RUTA] Archivo del modelo NO ENCONTRADO en: {model_path}", flush=True)
        return {'status': 'error', 'message': f'Archivo del modelo no encontrado: {model_path}'}

    try:
        interpreter = tf.lite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()
        print("[IA DEBUG] Modelo TFLite cargado y tensores asignados.") # Log adicional
    except Exception as e:
        print(f"[ERROR TFLITE] Fallo al cargar modelo TFLite: {e}", flush=True)
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
    # CORRECCIÓN CRÍTICA: ACEPTAR ARGUMENTOS INESPERADOS (como 'stock') y DISPONIBILIDAD
    # Estos son capturados por FastAPI/Pydantic y se pasan como kwargs.
    **kwargs: Any 
):
    print(f"\n[INICIO] Procesando producto: {codigo_barras}")
    current_time = datetime.now().isoformat()

    if supabase is None:
        print("[ERROR CRÍTICO] Supabase no está inicializado.")
        return {'status': 'error', 'message': 'El servicio de base de datos Supabase no está inicializado. Error de configuración.'}
    
    # Se añade log para verificar si se recibieron argumentos extra (ej. 'stock')
    if kwargs:
        print(f"[ADVERTENCIA] Argumentos extra recibidos (ignorados): {list(kwargs.keys())}")


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
        return {'status': 'error', 'message': prediction_result['message']}

    estado_producto = prediction_result['predicted_label'].lower()
    print(f"[IA] Estado clasificado: **{estado_producto}**")

    # 3️⃣ Subir imagen a Supabase Storage
    try:
        supabase.storage.from_("imagenes").upload(
            file=image_bytes,
            path=file_name,
            file_options={"content-type": "image/jpeg"}
        )
        print(f"[STORAGE] Imagen subida a: {storage_path}")
    except Exception as e:
        return {'status': 'error', 'message': f"Error al subir imagen: {e}"}

    # 4️⃣ Insertar o actualizar producto en 'productos'
    print("[DB] Consultando producto existente...")
    cat_id_int = int(categoria_id) if categoria_id and str(categoria_id).isdigit() else None

    try:
        # Se necesita obtener la 'unidad' actual para calcular el nuevo stock TOTAL.
        response_prod = supabase.table('productos').select('id, unidad').eq('codigo_barras', codigo_barras).maybe_single().execute()
        response_prod_data = response_prod.data if response_prod and hasattr(response_prod, "data") else None
    except Exception as e:
        return {'status': 'error', 'message': f"Error al consultar producto: {e}"}

    producto_id = None
    new_stock_total = 1 # Por defecto, si es nuevo, el stock total será 1 después de este ingreso.

    if response_prod_data:
        # Producto existente
        producto_id = response_prod_data['id']
        current_stock_total = response_prod_data.get('unidad', 0)
        new_stock_total = current_stock_total + 1
        print(f"[DB] Producto existente ID {producto_id}. Stock total previo: {current_stock_total}, Nuevo stock total: {new_stock_total}")

        update_data = {
            'unidad': new_stock_total,
            'estado': estado_producto,
            'disponibilidad': get_disponibilidad(new_stock_total),
            'updated_at': current_time # Añadir el campo de actualización
        }

        response = supabase.table('productos').update(update_data).eq('id', producto_id).execute()
        if not response or not hasattr(response, "data") or not response.data:
             return {'status': 'error', 'message': f"Fallo al actualizar producto: {getattr(response.error, 'message', 'Error desconocido')}"}

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
            'unidad': new_stock_total, # Stock total inicializado a 1
            'estado': estado_producto,
            'disponibilidad': get_disponibilidad(new_stock_total),
            'created_at': current_time,
            'updated_at': current_time
        }

        response = supabase.table('productos').insert(insert_data).execute()
        if not response or not hasattr(response, "data") or not response.data:
            return {'status': 'error', 'message': f"Fallo al insertar producto: {getattr(response.error, 'message', 'Error desconocido')}"}

        producto_id = response.data[0]['id']
        print(f"[DB] Inserción exitosa. Nuevo Producto ID: {producto_id}")

    # 5️⃣ Registrar la entrada en la tabla 'stock' (CORRECCIÓN CRÍTICA)
    # Esto refleja el movimiento de una unidad.
    stock_data_to_insert = {
        'producto_id': producto_id,
        'cantidad': 1,  # Siempre se registra la entrada de 1 unidad por imagen/escaneo
        'ultima_actualizacion': current_time,
        'disponibilidad': True, # Se asume disponible al ingresar
        'estado': estado_producto, # El estado del stock se basa en la clasificación IA
        'created_at': current_time,
        'updated_at': current_time
    }
    print(f"[DB] Registrando entrada en tabla 'stock' para Producto ID {producto_id}.")

    try:
        response_stock = supabase.table('stock').insert(stock_data_to_insert).execute()
        if not response_stock or not hasattr(response_stock, "data") or not response_stock.data:
            error_msg = getattr(response_stock.error, "message", "Error desconocido en inserción de stock")
            print(f"[ERROR DB] Fallo al insertar en tabla 'stock': {error_msg}")
            # NOTA: En un entorno de producción, aquí podrías querer revertir el cambio en 'productos'.
            return {'status': 'error', 'message': f"Error al insertar en tabla 'stock': {error_msg}"}
        print("[DB] Registro de stock exitoso.")
    except Exception as e:
        print(f"[ERROR DB] Excepción al insertar en tabla 'stock': {e}")
        return {'status': 'error', 'message': f"Excepción al insertar en tabla 'stock': {e}"}


    # 6️⃣ Registrar imagen en 'imagenes' (Ajuste de campos)
    image_data_to_insert = {
        'producto_id': producto_id,
        'storage_path': storage_path,
        # hash_archivo se omite ya que no se calcula en el código, pero es un campo en el DER.
        'ancho': ancho,
        'alto': alto,
        'tomado_en': current_time, # Usando 'tomado_en' en lugar de 'fecha_captura'
        'tomado_por': user_email, # Usando 'tomado_por' en lugar de 'correo_captura'
        # notas, created_at, updated_at se omiten aquí ya que Supabase los puede gestionar o
        # se pueden añadir si el ORM lo requiere.
    }
    print(f"[DB] Intentando insertar registro de imagen para Producto ID {producto_id}.")

    response_img = supabase.table('imagenes').insert(image_data_to_insert).execute()
    if response_img and hasattr(response_img, "data") and response_img.data:
        print("[DB] Registro de imagen exitoso.")
        return {
            'status': 'success',
            'message': 'Producto, registro de stock e imagen registrados.',
            'producto_id': producto_id,
            'estado_clasificado': estado_producto,
            'stock_actual': new_stock_total
        }
    else:
        error_msg = getattr(response_img.error, "message", "Error desconocido en inserción de imagen")
        print(f"[ERROR DB] Fallo al insertar en tabla 'imagenes': {error_msg}")
        return {'status': 'error', 'message': f"Error al insertar en tabla 'imagenes': {error_msg}"}