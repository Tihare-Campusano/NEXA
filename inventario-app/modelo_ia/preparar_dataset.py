# -*- coding: utf-8 -*-
import os
import shutil
from PIL import Image, UnidentifiedImageError
from sklearn.model_selection import train_test_split
import numpy as np
from tensorflow.keras.preprocessing.image import ImageDataGenerator

# --- Configuración general ---

BASE_DIR = "inventario-app/modelo_ia/dataset_inicial"   # Dataset descargado
OUTPUT_DIR = "inventario-app/modelo_ia/dataset_limpio"  # Dataset procesado
IMG_SIZE = (224, 224)                                   # Tamaño estándar (para modelos tipo MobileNet o ResNet)
VAL_RATIO = 0.15
TEST_RATIO = 0.15

# --- Preparar estructura de carpetas destino ---
for split in ["train", "val", "test"]:
    for estado in os.listdir(BASE_DIR):
        estado_path = os.path.join(BASE_DIR, estado)
        if os.path.isdir(estado_path):
            os.makedirs(os.path.join(OUTPUT_DIR, split, estado), exist_ok=True)

# --- Función de procesamiento de imagen ---
def procesar_y_guardar(lista_imgs, split, estado):
    for idx, img_path in enumerate(lista_imgs):
        try:
            img = Image.open(img_path).convert("RGB")
            img = img.resize(IMG_SIZE)

            # Guardar en carpeta correspondiente
            nombre = os.path.basename(img_path)
            destino = os.path.join(OUTPUT_DIR, split, estado, f"{estado}_{idx}.jpg")

            img.save(destino, quality=95)
        except (UnidentifiedImageError, OSError) as e:
            print(f"[ERROR] Imagen inválida o dañada: {img_path} ({e})")
        except Exception as e:
            print(f"[ERROR] {img_path}: {e}")

# --- Procesamiento principal ---
for estado in os.listdir(BASE_DIR):
    estado_path = os.path.join(BASE_DIR, estado)
    if not os.path.isdir(estado_path):
        continue

    print(f"\n[INFO] Procesando categoría: {estado}")

    # Recolectar todas las imágenes válidas (.jpg o .png)
    imagenes = [
        os.path.join(estado_path, f)
        for f in os.listdir(estado_path)
        if f.lower().endswith(('.jpg', '.jpeg', '.png'))
    ]

    # Dividir dataset en train/val/test
    imgs_train, imgs_temp = train_test_split(
        imagenes, test_size=(VAL_RATIO + TEST_RATIO), random_state=42
    )
    imgs_val, imgs_test = train_test_split(
        imgs_temp, test_size=TEST_RATIO / (VAL_RATIO + TEST_RATIO), random_state=42
    )

    # Procesar cada subconjunto
    procesar_y_guardar(imgs_train, "train", estado)
    procesar_y_guardar(imgs_val, "val", estado)
    procesar_y_guardar(imgs_test, "test", estado)

print("\n✅ Dataset limpiado, redimensionado y dividido correctamente.")

# --- Generadores de datos para Keras ---
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=25,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.15,
    zoom_range=0.2,
    horizontal_flip=True,
    fill_mode="nearest"
)

val_datagen = ImageDataGenerator(rescale=1./255)

train_generator = train_datagen.flow_from_directory(
    os.path.join(OUTPUT_DIR, "train"),
    target_size=IMG_SIZE,
    batch_size=32,
    class_mode="categorical"
)

val_generator = val_datagen.flow_from_directory(
    os.path.join(OUTPUT_DIR, "val"),
    target_size=IMG_SIZE,
    batch_size=32,
    class_mode="categorical"
)

print("\n✅ Generadores Keras listos para entrenamiento")