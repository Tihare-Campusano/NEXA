# -*- coding: utf-8 -*-
"""
preparar_dataset_mejorado_full_v3.py
----------------------------------------------------
Prepara un dataset BALANCEADO y AMPLIADO (train/val/test) para CNNs.
*** VERSIÓN OPTIMIZADA CON DEDUPLICACIÓN Y TARGET DE BALANCEO REDUCIDO ***
"""

import os
import shutil
import numpy as np
import random
from PIL import Image, ImageOps, UnidentifiedImageError
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
from tensorflow.keras.preprocessing.image import ImageDataGenerator, img_to_array, array_to_img
import tensorflow as tf
# Librería necesaria para deduplicación perceptual
try:
    import imagehash
except ImportError:
    print("ADVERTENCIA: La librería 'imagehash' no está instalada.")
    print("Ejecuta: pip install imagehash")
    imagehash = None

# ----------------------------------------------------
# CONFIGURACIÓN GENERAL (AJUSTADA) 🔧
# ----------------------------------------------------
BASE_DIR = "inventario-app/modelo_ia/dataset_inicial"
OUTPUT_DIR = "inventario-app/modelo_ia/dataset_limpio"
IMG_SIZE = (224, 224)
VAL_RATIO = 0.15
TEST_RATIO = 0.15
RANDOM_STATE = 42
BATCH_SIZE = 32
# AJUSTE CRÍTICO: Reducido de 20000 a 8000 para limitar el sobreajuste sintético
TARGET_PER_CLASS = 8000  

preprocess_fn = tf.keras.applications.mobilenet_v2.preprocess_input

# ----------------------------------------------------
# CREAR ESTRUCTURA BASE
# ----------------------------------------------------
print(f"\n[INICIO] Preparando dataset desde {BASE_DIR}")

if os.path.exists(OUTPUT_DIR):
    shutil.rmtree(OUTPUT_DIR)
os.makedirs(OUTPUT_DIR, exist_ok=True)

categorias = [c for c in os.listdir(BASE_DIR) if os.path.isdir(os.path.join(BASE_DIR, c))]
if not categorias:
    raise Exception(f"No se encontraron categorías en {BASE_DIR}")

for split in ["train", "val", "test"]:
    for cat in categorias:
        os.makedirs(os.path.join(OUTPUT_DIR, split, cat), exist_ok=True)

print("[OK] Estructura creada correctamente.")

# ----------------------------------------------------
# FUNCIONES AUXILIARES
# ----------------------------------------------------
def limpiar_imagen(img: Image.Image) -> Image.Image:
    img = img.convert("RGB")
    # Usar ImageOps.fit es mejor para mantener la proporción sin deformar
    img = ImageOps.fit(img, IMG_SIZE, Image.Resampling.LANCZOS)
    return img

def es_imagen_plana(img: Image.Image, umbral_varianza=15): # Umbral elevado a 15 (opcional)
    """Detecta imágenes casi uniformes (negras, blancas o de un solo color)."""
    img_gray = img.convert("L")
    varianza = np.var(np.array(img_gray))
    return varianza < umbral_varianza

def deduplicar_imagenes(images, labels):
    """Elimina imágenes duplicadas o casi idénticas usando pHash."""
    if not imagehash:
        return images, labels
    
    hashes = set()
    unique_images = []
    unique_labels = []
    
    print("\n[LIMPIEZA] Aplicando deduplicación perceptual...")

    for ruta, label in zip(images, labels):
        try:
            with Image.open(ruta) as img:
                # Usar pHash con un tamaño de 8x8
                h = imagehash.phash(img, hash_size=8) 
                
                if h not in hashes:
                    hashes.add(h)
                    unique_images.append(ruta)
                    unique_labels.append(label)
        except Exception:
            # Ignorar archivos corruptos durante la deduplicación
            continue
            
    print(f"  [INFO] Duplicados eliminados: {len(images) - len(unique_images)}.")
    return unique_images, unique_labels

def procesar_y_guardar(img_paths, split, clase):
    """Guarda imágenes procesadas en su carpeta final."""
    for idx, ruta in enumerate(img_paths):
        try:
            with Image.open(ruta) as img:
                img = limpiar_imagen(img)
                if es_imagen_plana(img):
                    continue
                destino = os.path.join(OUTPUT_DIR, split, clase, f"{clase}_{idx:05d}.jpg")
                img.save(destino, quality=95)
        except (UnidentifiedImageError, OSError, PermissionError):
            continue

def generar_augmented_images(img_paths, clase, n_target):
    """Genera imágenes aumentadas hasta alcanzar n_target por clase."""
    valid_imgs = []
    for ruta in img_paths:
        try:
            with Image.open(ruta) as img:
                img = limpiar_imagen(img)
                if not es_imagen_plana(img):
                    valid_imgs.append(img_to_array(img))
        except Exception:
            continue

    if not valid_imgs:
        return []

    valid_imgs = np.array(valid_imgs)
    # Generador de Augmentation para el oversampling (más agresivo que el de entrenamiento)
    aug_gen = ImageDataGenerator(
        rotation_range=25,
        width_shift_range=0.15,
        height_shift_range=0.15,
        shear_range=0.15,
        zoom_range=[0.85, 1.15],
        brightness_range=[0.8, 1.2],
        horizontal_flip=True,
        fill_mode="nearest"
    )

    generated_paths = []
    total_needed = max(0, n_target - len(valid_imgs))
    print(f"  -> {clase}: generando {total_needed} imágenes sintéticas...")

    i = 0
    for batch in aug_gen.flow(valid_imgs, batch_size=1):
        img_aug = array_to_img(batch[0])
        # NOTA: Las imágenes aumentadas se guardan temporalmente en BASE_DIR/clase
        destino = os.path.join(BASE_DIR, clase, f"{clase}_aug_{i:05d}.jpg")
        img_aug.save(destino, quality=95)
        generated_paths.append(destino)
        i += 1
        if i >= total_needed:
            break

    return generated_paths

# ----------------------------------------------------
# CARGA, LIMPIEZA Y BALANCEO
# ----------------------------------------------------
print("\n[CARGA] Leyendo imágenes del dataset inicial...")

all_images, all_labels = [], []
for cat in categorias:
    ruta_cat = os.path.join(BASE_DIR, cat)
    imgs = [os.path.join(ruta_cat, f)
            for f in os.listdir(ruta_cat)
            if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    all_images.extend(imgs)
    all_labels.extend([cat] * len(imgs))
    
# --- PASO CRÍTICO DE DEDUPLICACIÓN ---
all_images, all_labels = deduplicar_imagenes(all_images, all_labels)
# -------------------------------------

expanded_imgs, expanded_labels = [], []
for cat in categorias:
    imgs_cat = [img for img, lbl in zip(all_images, all_labels) if lbl == cat]
    
    print(f"Procesando clase '{cat}' con {len(imgs_cat)} imágenes originales limpias...")

    # Balanceo por oversampling si es necesario
    if len(imgs_cat) < TARGET_PER_CLASS:
        generated = generar_augmented_images(imgs_cat, cat, TARGET_PER_CLASS)
        imgs_cat.extend(generated)

    expanded_imgs.extend(imgs_cat)
    expanded_labels.extend([cat] * len(imgs_cat))

print("\n[OK] Dataset expandido balanceado correctamente.")

# ----------------------------------------------------
# DIVISIÓN ESTRATIFICADA
# ----------------------------------------------------
test_temp_ratio = VAL_RATIO + TEST_RATIO
val_to_test_ratio = TEST_RATIO / test_temp_ratio

imgs_train, imgs_temp, labels_train, labels_temp = train_test_split(
    expanded_imgs, expanded_labels,
    test_size=test_temp_ratio,
    random_state=RANDOM_STATE,
    stratify=expanded_labels
)

imgs_val, imgs_test, labels_val, labels_test = train_test_split(
    imgs_temp, labels_temp,
    test_size=val_to_test_ratio,
    random_state=RANDOM_STATE,
    stratify=labels_temp
)

print(f"[INFO] Train={len(imgs_train)}, Val={len(imgs_val)}, Test={len(imgs_test)}")

# ----------------------------------------------------
# PROCESAMIENTO Y GUARDADO FINAL
# ----------------------------------------------------
print("\n[GUARDADO] Procesando y guardando sets de datos...")

for cat in categorias:
    procesar_y_guardar([img for img, lbl in zip(imgs_train, labels_train) if lbl == cat], "train", cat)
    procesar_y_guardar([img for img, lbl in zip(imgs_val, labels_val) if lbl == cat], "val", cat)
    procesar_y_guardar([img for img, lbl in zip(imgs_test, labels_test) if lbl == cat], "test", cat)

print("[OK] Imágenes procesadas y guardadas correctamente dentro de dataset_limpio.")

# ----------------------------------------------------
# GENERADORES CON DATA AUGMENTATION (Para Entrenamiento)
# ----------------------------------------------------
train_aug = ImageDataGenerator(
    preprocessing_function=preprocess_fn,
    rotation_range=35,
    width_shift_range=0.20,
    height_shift_range=0.20,
    shear_range=0.20,
    zoom_range=[0.8, 1.2],
    brightness_range=[0.7, 1.3],
    channel_shift_range=20.0,
    horizontal_flip=True,
    fill_mode="nearest"
)

val_test_aug = ImageDataGenerator(preprocessing_function=preprocess_fn)

train_gen = train_aug.flow_from_directory(
    os.path.join(OUTPUT_DIR, "train"),
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical"
)

val_gen = val_test_aug.flow_from_directory(
    os.path.join(OUTPUT_DIR, "val"),
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    shuffle=False
)

test_gen = val_test_aug.flow_from_directory(
    os.path.join(OUTPUT_DIR, "test"),
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    shuffle=False
)

# ----------------------------------------------------
# CÁLCULO DE PESOS DE CLASE
# ----------------------------------------------------
labels = train_gen.classes
class_weights_arr = compute_class_weight(
    class_weight="balanced",
    classes=np.unique(labels),
    y=labels
)
class_weights = dict(enumerate(class_weights_arr))

print("\n[OK] Pesos de clase calculados:")
idx_to_class = {v: k for k, v in train_gen.class_indices.items()}
for i, w in class_weights.items():
    print(f"  {idx_to_class[i]}: {w:.4f}")

# ----------------------------------------------------
# RESUMEN FINAL
# ----------------------------------------------------
print("\nRESUMEN FINAL DEL DATASET:")
print(f" * Categorías: {len(categorias)} -> {categorias}")
print(f" * Train: {train_gen.samples}")
print(f" * Val:   {val_gen.samples}")
print(f" * Test:  {test_gen.samples}")
print(f" * Tamaño: {IMG_SIZE}")
print("\nDataset listo para entrenamiento con MobileNetV2.")