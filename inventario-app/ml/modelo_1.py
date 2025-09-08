# modelo_1.py
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam
import os

# -----------------------------
# 1️⃣ Configuración básica
# -----------------------------
img_height, img_width = 224, 224  # MobileNetV2 recomienda 224x224
batch_size = 32
epochs = 10  # ajusta según tus recursos
num_classes = 3  # nuevo, usado, mal_estado

dataset_dir = "dataset_limpio"  # carpeta que contiene las subcarpetas 'nuevo', 'usado', 'mal_estado'

# -----------------------------
# 2️⃣ Preparar generadores de imágenes
# -----------------------------
train_datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2,  # 20% para validación
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.15,
    zoom_range=0.2,
    horizontal_flip=True,
    fill_mode='nearest'
)

train_generator = train_datagen.flow_from_directory(
    dataset_dir,
    target_size=(img_height, img_width),
    batch_size=batch_size,
    class_mode='categorical',
    subset='training',
    shuffle=True
)

validation_generator = train_datagen.flow_from_directory(
    dataset_dir,
    target_size=(img_height, img_width),
    batch_size=batch_size,
    class_mode='categorical',
    subset='validation',
    shuffle=False
)

# -----------------------------
# 3️⃣ Cargar MobileNetV2 sin la cabeza
# -----------------------------
base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(img_height, img_width, 3))
base_model.trainable = False  # congelamos la base para entrenar solo la cabeza primero

# -----------------------------
# 4️⃣ Agregar la "cabeza" del modelo
# -----------------------------
x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(128, activation='relu')(x)
predictions = Dense(num_classes, activation='softmax')(x)

model = Model(inputs=base_model.input, outputs=predictions)

# -----------------------------
# 5️⃣ Compilar el modelo
# -----------------------------
model.compile(optimizer=Adam(learning_rate=0.0001),
    loss='categorical_crossentropy',
    metrics=['accuracy'])

# -----------------------------
# 6️⃣ Entrenar el modelo
# -----------------------------
history = model.fit(
    train_generator,
    validation_data=validation_generator,
    epochs=epochs
)

# -----------------------------
# 7️⃣ Guardar modelo final
# -----------------------------
model.save('modelo_final.h5')
print("✅ Modelo entrenado y guardado como modelo_final.h5")