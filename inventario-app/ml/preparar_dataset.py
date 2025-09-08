import os
from PIL import Image
from sklearn.model_selection import train_test_split
import numpy as np
# type: ignore
from tensorflow.keras.preprocessing.image import ImageDataGenerator  # type: ignore

# Configuración
base_dir = "train"  # carpeta original con estados y productos
output_dir = "dataset_limpio"  # carpeta final
IMG_SIZE = (224, 224)
val_ratio = 0.15
test_ratio = 0.15

# Crear carpetas finales incluyendo subproductos
for split in ["train", "val", "test"]:
    for estado in os.listdir(base_dir):
        estado_path = os.path.join(base_dir, estado)
        if not os.path.isdir(estado_path):
            continue
        for producto in os.listdir(estado_path):
            os.makedirs(os.path.join(output_dir, split, estado, producto), exist_ok=True)

# Procesar imágenes
for estado in os.listdir(base_dir):
    estado_path = os.path.join(base_dir, estado)
    for producto in os.listdir(estado_path):
        producto_path = os.path.join(estado_path, producto)
        imagenes = [os.path.join(producto_path, f) for f in os.listdir(producto_path) if f.lower().endswith(('.jpg','.png'))]

        # Dividir dataset
        imgs_train, imgs_temp = train_test_split(imagenes, test_size=(val_ratio + test_ratio), random_state=42)
        imgs_val, imgs_test = train_test_split(imgs_temp, test_size=test_ratio/(val_ratio + test_ratio), random_state=42)

        # Función para copiar, redimensionar y normalizar
        def copiar_y_redimensionar(lista_imgs, split):
            for idx, img_path in enumerate(lista_imgs):
                try:
                    img = Image.open(img_path).convert('RGB')
                    img = img.resize(IMG_SIZE)
                    nombre = f"{producto}_{idx}.jpg"
                    destino = os.path.join(output_dir, split, estado, producto, nombre)
                    # Guardar imagen normalizada (0-1) en numpy
                    img_array = np.array(img, dtype=np.float32) / 255.0
                    Image.fromarray((img_array*255).astype(np.uint8)).save(destino)
                except Exception as e:
                    print(f"Error procesando {img_path}: {e}")

        copiar_y_redimensionar(imgs_train, "train")
        copiar_y_redimensionar(imgs_val, "val")
        copiar_y_redimensionar(imgs_test, "test")

print("✅ Dataset listo con subproductos, redimensionado, normalizado y dividido en train/val/test")

# Opcional: configurar generadores de datos Keras
train_datagen = ImageDataGenerator(
    rescale=1./255,
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    horizontal_flip=True
)
val_datagen = ImageDataGenerator(rescale=1./255)

train_generator = train_datagen.flow_from_directory(
    os.path.join(output_dir, "train"),
    target_size=IMG_SIZE,
    batch_size=32,
    class_mode='categorical'
)

val_generator = val_datagen.flow_from_directory(
    os.path.join(output_dir, "val"),
    target_size=IMG_SIZE,
    batch_size=32,
    class_mode='categorical'
)

print("✅ Generadores Keras listos para entrenamiento")