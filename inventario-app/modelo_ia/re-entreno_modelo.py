# -*- coding: utf-8 -*-
"""
re-entreno_modelo_N3.py
---------------------------------------
Script para realizar el TERCER Fine-Tuning (ajuste fino) sobre el modelo V2, 
utilizando datos curados para mejorar la precisión al 80% o más.
"""

import os
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.optimizers import Adam
import numpy as np

# --- Configuración de Rutas y Parámetros ---

# Directorio base (donde está este script)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Rutas de Archivos (Actualizadas para N3)
MODELO_ACTUAL_PATH = os.path.join(BASE_DIR, "modelo_final_v2.h5") # <-- Carga el resultado del N2
MODELO_NUEVO_PATH = os.path.join(BASE_DIR, "modelo_final_v3.h5")  # <-- Nuevo nombre V3
MODELO_TFLITE_PATH = os.path.join(BASE_DIR, "modelo_final_v3.tflite") # <-- Nuevo nombre TFLite V3

# Directorio con las nuevas imágenes para re-entrenamiento
DATA_DIR = os.path.join(BASE_DIR, "nuevos_datos_entrenamiento") 

# Parámetros del modelo original
IMG_SIZE = (224, 224)
BATCH_SIZE = 32 # Tamaño de lote para procesamiento de datos
LR_FINETUNE = 1e-5  # Tasa de aprendizaje muy baja para Fine-Tuning (0.00001)
EPOCHS = 100         # Número de épocas de re-entrenamiento (Alto, para el salto final)

# --- 1. Carga y Preparación de Datos ---

print("--- 1. Preparando Datos ---")

if not os.path.exists(DATA_DIR):
    print(f"ERROR: Directorio de datos no encontrado: {DATA_DIR}")
    print("Asegúrate de crear la carpeta y organizar tus imágenes dentro de subcarpetas (ej: /nuevo, /usado).")
    exit()

# Generador de datos para cargar y aumentar imágenes
datagen = ImageDataGenerator(
    preprocessing_function=tf.keras.applications.mobilenet_v2.preprocess_input,
    validation_split=0.2, # 20% de los datos serán para validación
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.2,
    zoom_range=0.2,
    horizontal_flip=True
)

# Cargar datos de entrenamiento
train_generator = datagen.flow_from_directory(
    DATA_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='training'
)

# Cargar datos de validación
validation_generator = datagen.flow_from_directory(
    DATA_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation'
)

NUM_CLASSES = train_generator.num_classes
print(f"Clases detectadas: {NUM_CLASSES}. Etiquetas: {list(train_generator.class_indices.keys())}")


# --- 2. Carga del Modelo Existente y Configuración para Fine-Tuning ---

print("\n--- 2. Cargando Modelo Existente ---")

# Importante: Ahora carga el modelo_final_v2.h5
if not os.path.exists(MODELO_ACTUAL_PATH):
    print(f"ERROR: Modelo inicial (V2) no encontrado en: {MODELO_ACTUAL_PATH}")
    print("Asegúrate de renombrar el resultado de tu entrenamiento anterior a 'modelo_final_v2.h5'")
    exit()
    
# Cargar el modelo sin compilar
modelo = load_model(MODELO_ACTUAL_PATH, compile=False)

# Recompilar con una tasa de aprendizaje (Learning Rate) muy baja
modelo.compile(
    optimizer=Adam(learning_rate=LR_FINETUNE), 
    loss='categorical_crossentropy', 
    metrics=['accuracy']
)

print(f"Modelo cargado y configurado con Learning Rate: {LR_FINETUNE}")


# --- 3. Re-entrenamiento (Fine-Tuning) ---

print(f"\n--- 3. Iniciando TERCER Re-entrenamiento por {EPOCHS} épocas ---")

history = modelo.fit(
    train_generator,
    steps_per_epoch=train_generator.samples // BATCH_SIZE,
    epochs=EPOCHS,
    validation_data=validation_generator,
    validation_steps=validation_generator.samples // BATCH_SIZE
)

# --- 4. Guardar el Nuevo Modelo y Convertir a TFLite ---

print(f"\n--- 4. Finalizando, Guardando y Convirtiendo (Generando V3) ---")

# 4.1. Guardar el modelo re-entrenado en formato Keras (.h5)
modelo.save(MODELO_NUEVO_PATH)
print(f"ÉXITO: Nuevo modelo guardado en formato Keras: {MODELO_NUEVO_PATH}")

# 4.2. Conversión a TFLite
try:
    print("\nIniciando conversión a TFLite...")
    
    converter = tf.lite.TFLiteConverter.from_keras_model(modelo)
    tflite_model = converter.convert()
    
    with open(MODELO_TFLITE_PATH, 'wb') as f:
        f.write(tflite_model)
        
    print(f"ÉXITO: Modelo convertido y guardado como: {MODELO_TFLITE_PATH}")
    
except Exception as e:
    print(f"ERROR: Falló la conversión a TFLite. Detalle: {e}")