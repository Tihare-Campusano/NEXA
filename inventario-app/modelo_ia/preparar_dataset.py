# -*- coding: utf-8 -*-
"""
preparar_dataset_mejorado.py
----------------------------------------------------
Prepara un dataset balanceado, limpio y aumentado para modelos CNN.
Optimizado para aumentar precisión (70–90 %) con MobileNetV2 o EfficientNet.
"""

import os
import shutil
from PIL import Image, ImageOps, ImageEnhance, UnidentifiedImageError
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
import numpy as np
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import time

# ----------------------------------------------------
# CONFIGURACIÓN
# ----------------------------------------------------
BASE_DIR = "inventario-app/modelo_ia/dataset_inicial"
OUTPUT_DIR = "inventario-app/modelo_ia/dataset_limpio"
IMG_SIZE = (224, 224)
VAL_RATIO = 0.15
TEST_RATIO = 0.15
AUGMENT_MULTIPLIER = 3  # Genera 3 imágenes adicionales por cada imagen de entrenamiento

# ----------------------------------------------------
# CREAR ESTRUCTURA LIMPIA
# ----------------------------------------------------
if os.path.exists(OUTPUT_DIR):
    shutil.rmtree(OUTPUT_DIR)
os.makedirs(OUTPUT_DIR, exist_ok=True)

for split in ["train", "val", "test"]:
    for estado in os.listdir(BASE_DIR):
        estado_path = os.path.join(BASE_DIR, estado)
        if os.path.isdir(estado_path):
            os.makedirs(os.path.join(OUTPUT_DIR, split, estado), exist_ok=True)

# ----------------------------------------------------
# FUNCIÓN: limpiar, recortar y normalizar imagen
# ----------------------------------------------------
def limpiar_imagen(img: Image.Image) -> Image.Image:
    img = img.convert("RGB")
    img = ImageOps.fit(img, IMG_SIZE, Image.Resampling.LANCZOS)
    img = ImageEnhance.Contrast(img).enhance(1.3)
    img = ImageEnhance.Brightness(img).enhance(1.15)
    return img

# ----------------------------------------------------
# DATA AUGMENTATION (online)
# ----------------------------------------------------
train_aug = ImageDataGenerator(
    rescale=1.0 / 255,
    rotation_range=40,
    width_shift_range=0.3,
    height_shift_range=0.3,
    shear_range=0.25,
    zoom_range=[0.7, 1.3],
    brightness_range=[0.5, 1.5],
    channel_shift_range=25.0,
    horizontal_flip=True,
    vertical_flip=True,
    fill_mode="reflect"
)

val_aug = ImageDataGenerator(rescale=1.0 / 255)

# ----------------------------------------------------
# PROCESAR Y GUARDAR IMÁGENES
# ----------------------------------------------------
def procesar_y_guardar(lista_imgs, split, estado):
    for idx, img_path in enumerate(lista_imgs):
        try:
            with Image.open(img_path) as img:
                img = limpiar_imagen(img)

                destino = os.path.join(OUTPUT_DIR, split, estado, f"{estado}_{idx}.jpg")
                img.save(destino, quality=95)

                # Augmentación offline (solo para train)
                if split == "train" and AUGMENT_MULTIPLIER > 0:
                    base_array = np.array(img) / 255.0
                    for i in range(AUGMENT_MULTIPLIER):
                        gen_img = train_aug.random_transform(base_array)
                        gen_img = Image.fromarray((gen_img * 255).astype(np.uint8))
                        gen_path = os.path.join(OUTPUT_DIR, split, estado, f"{estado}_{idx}_aug{i}.jpg")
                        gen_img.save(gen_path, quality=90)

        except (UnidentifiedImageError, OSError, PermissionError):
            print(f"[ERROR] Imagen inválida o bloqueada: {img_path}")
        except Exception as e:
            print(f"[ERROR] {img_path}: {e}")

# ----------------------------------------------------
# PROCESO PRINCIPAL
# ----------------------------------------------------
print(f"\nIniciando preparación de dataset desde: {BASE_DIR}\n")

categorias = [c for c in os.listdir(BASE_DIR) if os.path.isdir(os.path.join(BASE_DIR, c))]
if not categorias:
    raise Exception(f"No se encontraron carpetas en {BASE_DIR}")

conteos = {c: len([f for f in os.listdir(os.path.join(BASE_DIR, c)) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]) for c in categorias}
max_count = max(conteos.values())

for estado in categorias:
    print(f"[INFO] Procesando categoría: {estado} ({conteos[estado]} imágenes originales)")

    estado_path = os.path.join(BASE_DIR, estado)
    imagenes = [
        os.path.join(estado_path, f)
        for f in os.listdir(estado_path)
        if f.lower().endswith(('.jpg', '.jpeg', '.png'))
    ]

    if not imagenes:
        print(f"[ADVERTENCIA] No se encontraron imágenes en {estado_path}")
        continue

    # Balanceo de clases
    if len(imagenes) < max_count:
        repeticiones = (max_count // len(imagenes)) + 1
        imagenes = (imagenes * repeticiones)[:max_count]

    # División del dataset
    imgs_train, imgs_temp = train_test_split(imagenes, test_size=(VAL_RATIO + TEST_RATIO), random_state=42)
    imgs_val, imgs_test = train_test_split(imgs_temp, test_size=TEST_RATIO / (VAL_RATIO + TEST_RATIO), random_state=42)

    procesar_y_guardar(imgs_train, "train", estado)
    procesar_y_guardar(imgs_val, "val", estado)
    procesar_y_guardar(imgs_test, "test", estado)

print("\nDataset limpio, balanceado y aumentado correctamente.\n")

# ----------------------------------------------------
# GENERADORES DE DATOS PARA KERAS
# ----------------------------------------------------
train_generator = train_aug.flow_from_directory(
    os.path.join(OUTPUT_DIR, "train"),
    target_size=IMG_SIZE,
    batch_size=32,
    class_mode="categorical"
)

val_generator = val_aug.flow_from_directory(
    os.path.join(OUTPUT_DIR, "val"),
    target_size=IMG_SIZE,
    batch_size=32,
    class_mode="categorical"
)

# ----------------------------------------------------
# CALCULAR PESOS DE CLASE
# ----------------------------------------------------
labels = train_generator.classes
class_weights = compute_class_weight(
    class_weight="balanced",
    classes=np.unique(labels),
    y=labels
)
class_weights = dict(enumerate(class_weights))

print("\nPesos de clase calculados (usa esto en modelo_ia.py):")
for k, v in class_weights.items():
    print(f"  Clase {k}: {v:.4f}")

# ----------------------------------------------------
# RESUMEN FINAL
# ----------------------------------------------------
print("\nRESUMEN DEL DATASET PREPARADO:")
print(f" - Categorías: {len(categorias)}")
print(f" - Train: {train_generator.samples} imágenes")
print(f" - Val:   {val_generator.samples} imágenes")
print(f" - Tamaño estándar: {IMG_SIZE}")
print(f" - Aumento offline: x{AUGMENT_MULTIPLIER + 1} total")
print("\nDataset listo para entrenamiento con MobileNetV2 o EfficientNet.\n")
time.sleep(2)