# -*- coding: utf-8 -*-
"""
test_modelo_ia.py
---------------------------------------
Script de prueba para el modelo de clasificación entrenado con MobileNetV2
utilizando el formato optimizado TFLite.
"""

import os
import tensorflow as tf
import numpy as np
import json
# Se elimina 'from tensorflow.keras.models import load_model'
from tensorflow.keras.preprocessing import image

# --- Configuración general ---
IMG_SIZE = (224, 224)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# *** CAMBIO 1: RUTAS RELATIVAS Y TFLITE ***
# Se asume que estos archivos están en el mismo directorio que el script
MODEL_PATH = os.path.join(BASE_DIR, "modelo_final_v2.tflite")
LABELS_PATH = os.path.join(BASE_DIR, "labels.txt")
IMAGE_TO_PREDICT = os.path.join(BASE_DIR, "test.jpeg") # Asegúrate de que esta imagen exista

CONFIDENCE_THRESHOLD = 0.80     # 80% de confianza mínima
OUTPUT_JSON = os.path.join(BASE_DIR, "resultado_test.json")

# MobileNetV2 preprocesa a un rango de [-1, 1]
preprocess_fn = tf.keras.applications.mobilenet_v2.preprocess_input


# --- Funciones auxiliares (Mantienen su funcionalidad original) ---
def get_labels(path):
    """Carga las etiquetas desde un archivo de texto (una por línea)."""
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return [line.strip() for line in f.readlines()]
    return None


def preprocess_image(img_path):
    """Carga y preprocesa una imagen para el modelo (como Numpy array)."""
    try:
        img = image.load_img(img_path, target_size=IMG_SIZE)
    except Exception as e:
        raise ValueError(f"Error al abrir la imagen: {e}")
    
    img_array = image.img_to_array(img)
    # TFLite espera un tensor 4D (batch, altura, ancho, canales)
    img_array = np.expand_dims(img_array, axis=0) 
    
    # Preprocesamiento específico de MobileNetV2
    processed_image = preprocess_fn(img_array)
    
    # Aseguramos el tipo de dato que espera TFLite, generalmente float32
    return processed_image.astype(np.float32)


# *** CAMBIO 2: LÓGICA DE PREDICCIÓN CON TFLITE ***
def predict_single_image(model_path, img_path, labels_path, threshold):
    """Carga el modelo TFLite y predice una sola imagen, retornando un diccionario JSON."""

    print(f"\n[DIAGNÓSTICO] Archivo a predecir: {os.path.basename(img_path)}")

    if not os.path.exists(model_path):
        return {'status': 'error', 'message': 'Archivo del modelo TFLite no encontrado.'}

    # Inicializar el intérprete de TFLite
    try:
        interpreter = tf.lite.Interpreter(model_path=model_path)
        interpreter.allocate_tensors()
    except Exception as e:
        return {'status': 'error', 'message': f"Error al cargar el intérprete TFLite: {e}"}

    # Obtener detalles del input y output del modelo
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    if not os.path.exists(img_path):
        return {'status': 'error', 'message': f"Archivo de imagen '{os.path.basename(img_path)}' no encontrado."}

    try:
        processed_image = preprocess_image(img_path)
    except Exception as e:
        return {'status': 'error', 'message': str(e)}

    # Asignar la entrada al tensor TFLite
    interpreter.set_tensor(input_details[0]['index'], processed_image)

    print("Realizando predicción TFLite...")
    # Correr la inferencia
    interpreter.invoke()
    
    # Obtener el resultado
    output_data = interpreter.get_tensor(output_details[0]['index'])
    predictions = output_data

    labels = get_labels(labels_path)
    if not labels:
        return {'status': 'error', 'message': f"No se pudieron cargar las etiquetas desde '{labels_path}'."}

    # La salida de TFLite es un array de Numpy, usualmente 1xN
    if len(labels) != predictions.shape[1]: 
        return {'status': 'error', 'message': f"Desajuste entre etiquetas ({len(labels)}) y salidas del modelo ({predictions.shape[1]})."}

    probabilities = predictions[0]
    predicted_class_index = np.argmax(probabilities)
    confidence = probabilities[predicted_class_index]

    # Formatear probabilidades completas
    confidence_scores = {labels[i]: f"{float(probabilities[i]) * 100:.2f}%" for i in range(len(labels))}

    # Mostrar Top-3 predicciones
    top_indices = np.argsort(probabilities)[::-1][:3]
    top_predictions = {labels[i]: f"{probabilities[i] * 100:.2f}%" for i in top_indices}
    print("\nTop-3 predicciones más probables:")
    for lbl, conf in top_predictions.items():
        print(f"  - {lbl}: {conf}")

    if confidence < threshold:
        predicted_label = "INCIERTO"
        detail = f"Confianza baja (< {threshold * 100:.0f}%). Se recomienda más entrenamiento o imagen más clara."
    else:
        predicted_label = labels[predicted_class_index]
        detail = f"Predicción exitosa (Confianza >= {threshold * 100:.0f}%)."

    result = {
        'status': 'success',
        'predicted_label': predicted_label,
        'confidence_score': f"{confidence * 100:.2f}%",
        'threshold_met': bool(confidence >= threshold),
        'detail': detail,
        'all_scores': confidence_scores,
        'top3_predictions': top_predictions
    }

    return result

# --- Ejecución principal (Se mantiene igual) ---
if __name__ == "__main__":

    print("--- INICIO DE PRUEBA DEL MODELO ---")
    prediction_result = predict_single_image(MODEL_PATH, IMAGE_TO_PREDICT, LABELS_PATH, CONFIDENCE_THRESHOLD)

    print("\n--- RESULTADO JSON SIMULADO ---")
    print(json.dumps(prediction_result, indent=4, ensure_ascii=False))

    # Guardar resultado JSON en archivo
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(prediction_result, f, indent=4, ensure_ascii=False)

    print(f"\nResultado guardado en: {OUTPUT_JSON}")

    print("\n--- CONCLUSIÓN ---")
    if prediction_result['status'] == 'success':
        print(f"ÉXITO: Predicción completada correctamente.")
        print(f"Etiqueta final: {prediction_result['predicted_label']}")
        print(f"Confianza: {prediction_result['confidence_score']}")
    else:
        print(f"ERROR: {prediction_result['message']}")