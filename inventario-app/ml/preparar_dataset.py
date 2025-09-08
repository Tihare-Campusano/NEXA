import os
from PIL import Image
from sklearn.model_selection import train_test_split

base_dir = "dataset/train"  # carpeta original con estados y productos
output_dir = "dataset_ready"  # carpeta final
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

        # Función para copiar y redimensionar
        def copiar_y_redimensionar(lista_imgs, split):
            for idx, img_path in enumerate(lista_imgs):
                try:
                    img = Image.open(img_path)
                    img = img.resize(IMG_SIZE)
                    nombre = f"{producto}_{idx}.jpg"
                    destino = os.path.join(output_dir, split, estado, producto, nombre)
                    img.save(destino)
                except:
                    print(f"Error procesando {img_path}")

        copiar_y_redimensionar(imgs_train, "train")
        copiar_y_redimensionar(imgs_val, "val")
        copiar_y_redimensionar(imgs_test, "test")

print("✅ Dataset listo con subproductos, redimensionado y dividido en train/val/test")
