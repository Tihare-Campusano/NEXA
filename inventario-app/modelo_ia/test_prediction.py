# -*- coding: utf-8 -*-
"""
test_modelo_ia.py
---------------------------------------
Script de prueba para el modelo de clasificación entrenado con MobileNetV2.
Verifica que el modelo funcione correctamente, aplica umbral de confianza y 
genera salida JSON para integrar con una app o API.
"""

import os
import tensorflow as tf
import numpy as np
import json
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image

# --- Configuración general ---
IMG_SIZE = (224, 224)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = r"C:\Users\cornu\OneDrive\Escritorio\NEXA\inventario-app\modelo_ia\modelo_final.h5"
LABELS_PATH = r"C:\Users\cornu\OneDrive\Escritorio\NEXA\inventario-app\modelo_ia\labels.txt"
IMAGE_TO_PREDICT = r"C:\Users\cornu\OneDrive\Escritorio\NEXA\inventario-app\modelo_ia\test.jpeg"

CONFIDENCE_THRESHOLD = 0.80  # 80% de confianza mínima
OUTPUT_JSON = os.path.join(BASE_DIR, "resultado_test.json")

preprocess_fn = tf.keras.applications.mobilenet_v2.preprocess_input


# --- Funciones auxiliares ---
def get_labels(path):
    """Carga las etiquetas desde un archivo de texto (una por línea)."""
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return [line.strip() for line in f.readlines()]
    return None


def preprocess_image(img_path):
    """Carga y preprocesa una imagen para el modelo."""
    try:
        img = image.load_img(img_path, target_size=IMG_SIZE)
    except Exception as e:
        raise ValueError(f"Error al abrir la imagen: {e}")
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    return preprocess_fn(img_array)


def predict_single_image(model_path, img_path, labels_path, threshold):
    """Carga el modelo y predice una sola imagen, retornando un diccionario JSON."""

    print(f"\n[DIAGNÓSTICO] Archivo a predecir: {os.path.basename(img_path)}")

    if not os.path.exists(model_path):
        return {'status': 'error', 'message': 'Archivo del modelo no encontrado.'}

    try:
        model = load_model(model_path, compile=False)
    except Exception as e:
        return {'status': 'error', 'message': f"Error al cargar el modelo: {e}"}

    if not os.path.exists(img_path):
        return {'status': 'error', 'message': f"Archivo de imagen '{os.path.basename(img_path)}' no encontrado."}

    try:
        processed_image = preprocess_image(img_path)
    except Exception as e:
        return {'status': 'error', 'message': str(e)}

    print("Realizando predicción...")
    predictions = model.predict(processed_image)

    labels = get_labels(labels_path)
    if not labels:
        return {'status': 'error', 'message': f"No se pudieron cargar las etiquetas desde '{labels_path}'."}

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
        print(f"  - {lbl}: {conf}")

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


def test_multiple_images(folder_path):
    """Permite probar varias imágenes en una carpeta."""
    files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    if not files:
        print(f"No se encontraron imágenes válidas en {folder_path}.")
        return
    for file in files:
        path = os.path.join(folder_path, file)
        result = predict_single_image(MODEL_PATH, path, LABELS_PATH, CONFIDENCE_THRESHOLD)
        print(f"\n[{file}] → {result.get('predicted_label')} ({result.get('confidence_score')})")


# --- Ejecución principal ---
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