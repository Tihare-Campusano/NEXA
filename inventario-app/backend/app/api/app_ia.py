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
from typing import Optional 

# --- 1. CONFIGURACIÓN E INICIALIZACIÓN ---
IMG_SIZE = (224, 224)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# RUTA DEL MODELO: Asume que 'modelo_ia' está en el mismo directorio (dentro de /api)
MODEL_DIR = os.path.join(BASE_DIR, "modelo_ia") 

MODEL_PATH = os.path.join(MODEL_DIR, "modelo_final_v3.tflite")
LABELS_PATH = os.path.join(MODEL_DIR, "labels.txt")

# 🛑 CORRECCIÓN 2: Umbral de confianza cambiado a 0.50 (50%)
CONFIDENCE_THRESHOLD = 0.50

# Cargar credenciales e inicializar Supabase
try:
    from credenciales import SUPABASE_URL, SUPABASE_ANON_KEY
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
except ImportError:
    print("Error: No se encontró 'credenciales.py'. Verifica la configuración.")
    exit()
except Exception as e:
    print(f"Error al inicializar cliente Supabase: {e}")
    exit()

# Preprocesamiento específico para MobileNetV2
preprocess_fn = tf.keras.applications.mobilenet_v2.preprocess_input

# --- 2. FUNCIONES AUXILIARES ---

def get_labels(path):
    """Carga las etiquetas desde un archivo de texto (una por línea)."""
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return [line.strip() for line in f.readlines()]
    return None

def preprocess_image(image_data: bytes, target_size=IMG_SIZE):
    """Carga y preprocesa una imagen (desde bytes) para el modelo TFLite."""
    try:
        img = image.load_img(BytesIO(image_data), target_size=target_size)
    except Exception as e:
        raise ValueError(f"Error al cargar la imagen desde bytes: {e}")
    
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)  # TFLite espera tensor 4D (Batch)
    processed_image = preprocess_fn(img_array)
    
    return processed_image.astype(np.float32)

def get_disponibilidad(cantidad: int) -> str:
    """Calcula la disponibilidad según las reglas de negocio."""
    if cantidad <= 0:
        return "Sin stock"
    if cantidad <= 4:
        return "Baja disponibilidad"
    if cantidad <= 10:
        return "Disponibilidad media"
    return "Alta disponibilidad"

# --- 3. LÓGICA DE PREDICCIÓN CON TFLITE ---

def predict_from_bytes(model_path, image_data: bytes, labels_path, threshold):
    """Ejecuta la inferencia TFLite en la imagen recibida."""
    
    if not os.path.exists(model_path):
        return {'status': 'error', 'message': f'Archivo del modelo TFLite no encontrado en la ruta: {model_path}'}

    try:
        interpreter = tf.lite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()
    except Exception as e:
        return {'status': 'error', 'message': f"Error al cargar el intérprete TFLite: {e}"}

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    try:
        processed_image = preprocess_image(image_data)
    except Exception as e:
        return {'status': 'error', 'message': str(e)}

    # Asignar entrada y correr inferencia
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

    # 🛑 CORRECCIÓN 2: Usar 0.50 de umbral
    predicted_label = labels[predicted_class_index] if confidence >= threshold else "INCIERTO"

    return {
        'status': 'success',
        'predicted_label': predicted_label,
        'confidence': float(confidence),
        'confidence_score': f"{confidence * 100:.2f}%",
        'threshold_met': bool(confidence >= threshold),
    }

# --- 4. FUNCIÓN PRINCIPAL DE REGISTRO EN SUPABASE (Llamada desde la API) ---

async def registrar_producto_y_imagen(
    image_base64: str, 
    codigo_barras: str, 
    user_email: str, 
    alto: int, 
    ancho: int,
    # 🛑 CAMPOS DEL FORMULARIO RECIBIDOS
    nombre: Optional[str] = None,
    marca: Optional[str] = None,
    modelo: Optional[str] = None,
    categoria_id: Optional[str] = None,
    compatibilidad: Optional[str] = None,
    observaciones: Optional[str] = None,
    # Campos que se ignoran pero se aceptan en el request
    stock: Optional[str] = None, 
    disponibilidad: Optional[str] = None,
    estado: Optional[str] = None
):
    """
    Procesa la imagen, clasifica el estado y registra los datos en Supabase.
    """
    print(f"\n[INICIO] Procesando producto: {codigo_barras}")
    current_time = datetime.now().isoformat()
    
    # 1. Decodificar Base64
    try:
        image_bytes = base64.b64decode(image_base64)
    except Exception as e:
        return {'status': 'error', 'message': f"Error al decodificar Base64 de la imagen: {e}"}
        
    file_name = f"{uuid.uuid4()}.jpeg"
    storage_path = f"imagenes/{file_name}"
    
    # 2. Clasificación del Estado del Producto (IA)
    prediction_result = predict_from_bytes(MODEL_PATH, image_bytes, LABELS_PATH, CONFIDENCE_THRESHOLD)
    
    if prediction_result['status'] == 'error':
        print(f"[ERROR IA] {prediction_result['message']}")
        return {'status': 'error', 'message': prediction_result['message']}

    estado_producto = prediction_result['predicted_label'].lower()
    print(f"[IA] Estado clasificado: **{estado_producto}** con confianza de {prediction_result['confidence_score']}")
    
    # 3. Subida de la imagen al Storage (Bucket 'imagenes')
    try:
        supabase.storage.from_("imagenes").upload(
            file=image_bytes, 
            path=file_name,
            file_options={"content-type": "image/jpeg"}
        )
        print(f"[STORAGE] Imagen subida a: {storage_path}")
    except Exception as e:
        print(f"[ERROR STORAGE] Falló la subida de imagen: {e}")
        return {'status': 'error', 'message': f"Error al subir imagen a Supabase Storage: {e}"}

    # 4. Actualización/Creación del Producto y UNIDADES (Tabla 'productos')
    
    # Seleccionar 'unidad' para el inventario
    response_prod = supabase.table('productos').select('id, unidad').eq('codigo_barras', codigo_barras).maybe_single().execute()
    
    new_stock_value = 1
    producto_id = None
    
    # --- Preparar valores seguros a partir del formulario ---
    cat_id_int = int(categoria_id) if categoria_id and categoria_id.isdigit() else None
    
    if response_prod.data:
        # Producto encontrado: Actualizar unidad
        current_stock = response_prod.data['unidad'] 
        producto_id = response_prod.data['id']
        new_stock_value = current_stock + 1
        
        update_data = {
            'unidad': new_stock_value,      
            'estado': estado_producto, 
            'disponibilidad': get_disponibilidad(new_stock_value)
        }
        
        response = supabase.table('productos').update(update_data).eq('id', producto_id).execute()
        
        # 🛑 MANEJO DE ERROR DE ACTUALIZACIÓN
        if response.error or not response.data:
             error_msg = response.error.message if response.error else "Error desconocido de Supabase al actualizar."
             return {'status': 'error', 'message': f"Fallo al actualizar producto: {error_msg}"}
        
    else:
        # Producto no encontrado: INSERTAR NUEVO PRODUCTO
        print("[DB] Producto nuevo. Insertando valores del formulario y defaults.")
        
        # 🛑 SOLUCIÓN FINAL AL CHECK CONSTRAINT (23514): Proveer todos los campos NOT NULL
        insert_data = {
            'codigo_barras': codigo_barras,
            
            # --- CAMPOS REQUERIDOS (Usamos datos del formulario o defaults seguros) ---
            'nombre': nombre or 'PRODUCTO NUEVO - PENDIENTE', 
            'marca': marca or 'N/A', 
            'modelo': modelo or 'N/A',
            # 🛑 Eliminamos 'precio'
            'categoria_id': cat_id_int,       
            'activo': True,                  
            'observaciones': observaciones or None, 
            
            # --- CAMPOS DE INVENTARIO ---
            'unidad': new_stock_value,
            'estado': estado_producto, 
            'disponibilidad': get_disponibilidad(new_stock_value)
        }
        
        response = supabase.table('productos').insert(insert_data).execute()
        
        # 🛑 MANEJO DE ERROR DE INSERCIÓN Y ELIMINACIÓN DE NONE_TYPE
        if response.error or not response.data or len(response.data) == 0:
            error_msg = response.error.message if response.error else "Error: La inserción falló sin mensaje SQL."
            
            if "foreign key" in error_msg.lower():
                error_msg += " -- SUGERENCIA: La clave foránea (categoría ID) no acepta NULL o el ID proporcionado no existe."
            
            return {'status': 'error', 'message': f"Fallo al insertar producto: {error_msg}"}
            
        producto_id = response.data[0]['id']


    # 5. Inserción en la tabla 'imagenes'
    image_data_to_insert = {
        'producto_id': producto_id, 
        'storage_path': storage_path,
        'ancho': ancho,
        'alto': alto,
        'fecha_captura': current_time,
        'correo_captura': user_email,
    }
    
    response_img = supabase.table('imagenes').insert(image_data_to_insert).execute()
    
    if response_img.data:
        print("[DB] Registro de imagen exitoso.")
        return {
            'status': 'success', 
            'message': 'Producto, stock e imagen registrados.',
            'producto_id': producto_id,
            'estado_clasificado': estado_producto,
            'stock_actual': new_stock_value 
        }
    else:
        print(f"[ERROR DB] Falló la inserción de la imagen: {response_img.status_code}")
        # Retornamos el error 400 que FastAPI captura como error interno
        return {'status': 'error', 'message': f"Error al insertar en tabla 'imagenes': {response_img.status_code}"}