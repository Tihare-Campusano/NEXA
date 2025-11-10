import os
import tensorflow as tf
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image

# --- Configuración ---
IMG_SIZE = (224, 224) 
MODEL_PATH = r"C:\Users\cornu\OneDrive\Escritorio\NEXA\inventario-app\modelo_ia\modelo_final.h5"  # Asegúrate de usar el nombre correcto del archivo de tu modelo guardado
IMAGE_TO_PREDICT = r"C:\Users\cornu\OneDrive\Escritorio\NEXA\inventario-app\modelo_ia\test.jpeg" # Nombre del archivo de la imagen que adjuntaste
LABELS_PATH = r"C:\Users\cornu\OneDrive\Escritorio\NEXA\inventario-app\modelo_ia\labels.txt" # El archivo de etiquetas guardado por tu script

# Usamos la función de preprocesado de MobileNetV2, CRUCIAL!
preprocess_fn = tf.keras.applications.mobilenet_v2.preprocess_input

def get_labels(path):
    """Carga las etiquetas de un archivo (una por línea)."""
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return [line.strip() for line in f.readlines()]
    return None

def preprocess_image(img_path):
    """Carga y preprocesa una imagen para el modelo."""
    # 1. Cargar y redimensionar la imagen al tamaño esperado (224x224)
    img = image.load_img(img_path, target_size=IMG_SIZE)
    # 2. Convertir a Array de numpy (forma: [Alto, Ancho, Canales])
    img_array = image.img_to_array(img)
    # 3. Expandir dimensiones para formar un batch (forma: [1, Alto, Ancho, Canales])
    img_array = np.expand_dims(img_array, axis=0)
    # 4. Aplicar la normalización de MobileNetV2: [0, 255] -> [-1, 1]
    return preprocess_fn(img_array)

def predict_single_image(model_path, img_path, labels_path):
    """Carga el modelo y predice una sola imagen."""
    
    print(f"Cargando modelo desde: {model_path}")
    if not os.path.exists(model_path):
        print("ERROR: Archivo del modelo no encontrado. Asegúrate de que el entrenamiento se haya completado y guardado correctamente.")
        return
        
    # Cargar el modelo (debe ser el modelo completo con la estructura correcta)
    # Nota: Si el modelo usa capas personalizadas, habría que pasarlas
    try:
        model = load_model(model_path)
    except Exception as e:
        print(f"ERROR al cargar el modelo: {e}")
        print("Asegúrate de que TensorFlow y Keras estén configurados correctamente.")
        return

    print(f"Cargando y preprocesando imagen: {img_path}")
    if not os.path.exists(img_path):
        print(f"ERROR: Archivo de imagen '{img_path}' no encontrado.")
        return

    # Preprocesar la imagen
    processed_image = preprocess_image(img_path)
    
    # Realizar la predicción
    print("Realizando predicción...")
    predictions = model.predict(processed_image)
    
    # Obtener el índice de la clase con mayor probabilidad
    predicted_class_index = np.argmax(predictions[0])
    
    # Obtener las etiquetas para interpretar el resultado
    labels = get_labels(labels_path)
    
    # --- Resultados ---
    print("\n--- Resultado de la Predicción ---")
    print(f"Puntuaciones (Softmax): {predictions[0]}")
    print(f"Índice de Clase Predicha: {predicted_class_index}")
    
    if labels and len(labels) > predicted_class_index:
        predicted_label = labels[predicted_class_index]
        confidence = predictions[0][predicted_class_index] * 100
        
        print(f"Etiqueta Predicha: **{predicted_label}**")
        print(f"Confianza: **{confidence:.2f}%**")
    elif labels:
        print("Advertencia: El índice predicho está fuera del rango de las etiquetas guardadas.")
    else:
        print(f"ERROR: No se pudieron cargar las etiquetas desde '{labels_path}'.")

if __name__ == "__main__":
    predict_single_image(MODEL_PATH, IMAGE_TO_PREDICT, LABELS_PATH)