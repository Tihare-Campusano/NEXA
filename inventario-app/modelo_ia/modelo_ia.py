# -*- coding: utf-8 -*-
# modelo_ia.py - Entrenamiento optimizado + Fine-tuning + exportación TFLite/TFJS
# Compatible con TensorFlow 2.15+ (usando tf.keras para compatibilidad)

import os
import tensorflow as tf
import matplotlib.pyplot as plt

# ✅ CORRECCIÓN: Usamos tf.keras para asegurar la compatibilidad con TensorFlow
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau

# -----------------------------
# 1️⃣ Configuración general
# -----------------------------
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 20
FINE_TUNE_EPOCHS = 10
NUM_CLASSES = 3  # nuevo, usado, mal_estado
LEARNING_RATE = 1e-4

# Rutas de trabajo
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# ✅ CORRECCIÓN: La carpeta del dataset se llama 'dataset_limpio'
DATASET_DIR = os.path.join(BASE_DIR, "dataset_limpio")
# ✅ CORRECCIÓN: La carpeta de guardado es el mismo directorio del script
SAVE_DIR = BASE_DIR

print(f"--- Dataset cargado desde: {DATASET_DIR}")
print(f"--- Modelos se guardarán en: {SAVE_DIR}")

# Verificar estructura de carpetas
for subdir in ["train", "val", "test"]:
    path = os.path.join(DATASET_DIR, subdir)
    if not os.path.exists(path):
        raise FileNotFoundError(f"No se encontró la carpeta '{subdir}' en {DATASET_DIR}. Asegúrate de que tu dataset tenga esa estructura.")

# -----------------------------
# 2️⃣ Generadores de imágenes
# -----------------------------
train_datagen = ImageDataGenerator(
    rescale=1. / 255,
    rotation_range=25,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.15,
    zoom_range=0.2,
    horizontal_flip=True,
    fill_mode="nearest"
)

val_datagen = ImageDataGenerator(rescale=1. / 255)
test_datagen = ImageDataGenerator(rescale=1. / 255)

train_generator = train_datagen.flow_from_directory(
    os.path.join(DATASET_DIR, "train"),
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical"
)

val_generator = val_datagen.flow_from_directory(
    os.path.join(DATASET_DIR, "val"),
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical"
)

test_generator = test_datagen.flow_from_directory(
    os.path.join(DATASET_DIR, "test"),
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    shuffle=False
)

# -----------------------------
# 3️⃣ Modelo base (Transfer Learning)
# -----------------------------
base_model = MobileNetV2(
    input_shape=(224, 224, 3),
    include_top=False,
    weights="imagenet"
)
base_model.trainable = False  # Congelamos capas base

# Capas personalizadas
x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(256, activation="relu")(x)
x = Dropout(0.4)(x)
output = Dense(NUM_CLASSES, activation="softmax")(x)
model = Model(inputs=base_model.input, outputs=output)

# -----------------------------
# 4️⃣ Compilación inicial
# -----------------------------
model.compile(
    optimizer=Adam(learning_rate=LEARNING_RATE),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

model.summary()

# -----------------------------
# 5️⃣ Callbacks
# -----------------------------
callbacks = [
    ModelCheckpoint(
        # Usar la ruta de guardado fija
        os.path.join(SAVE_DIR, "modelo_mejor.h5"),
        monitor="val_accuracy",
        save_best_only=True,
        verbose=1
    ),
    EarlyStopping(
        monitor="val_loss",
        patience=5,
        restore_best_weights=True,
        verbose=1
    ),
    ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.5,
        patience=3,
        verbose=1,
        min_lr=1e-6
    )
]

# -----------------------------
# 6️⃣ Entrenamiento inicial
# -----------------------------
history = model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=EPOCHS,
    callbacks=callbacks,
    verbose=1
)

# -----------------------------
# 7️⃣ Fine-tuning
# -----------------------------
base_model.trainable = True
for layer in base_model.layers[:100]:
    layer.trainable = False

model.compile(
    optimizer=Adam(learning_rate=LEARNING_RATE / 10),
    loss="categorical_crossentropy",
    metrics=["accuracy"]
)

history_fine = model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=EPOCHS + FINE_TUNE_EPOCHS,
    initial_epoch=history.epoch[-1] + 1,
    callbacks=callbacks,
    verbose=1
)

# -----------------------------
# 8️⃣ Evaluación y guardado final
# -----------------------------
test_loss, test_acc = model.evaluate(test_generator)
# Texto sin emoji para evitar UnicodeEncodeError
print(f"\n--- Precisión final en test: {test_acc:.2%}")

MODEL_H5_PATH = os.path.join(SAVE_DIR, "modelo_final.h5")
model.save(MODEL_H5_PATH)
print(f"--- Modelo guardado como {MODEL_H5_PATH}")

# -----------------------------
# 9️⃣ Exportar a TensorFlow Lite
# -----------------------------
try:
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()
    TFLITE_PATH = os.path.join(SAVE_DIR, "modelo_final.tflite")
    with open(TFLITE_PATH, "wb") as f:
        f.write(tflite_model)
    # Texto sin emoji
    print(f"--- Modelo convertido a TensorFlow Lite: {TFLITE_PATH}")
except Exception as e:
    print(f"--- Error al convertir a TFLite: {e}") 

# -----------------------------
# 🔟 Exportar a TensorFlow.js
# -----------------------------
try:
    import tensorflowjs as tfjs
    TFJS_DIR = os.path.join(SAVE_DIR, "modelo_tfjs")
    os.makedirs(TFJS_DIR, exist_ok=True)
    tfjs.converters.save_keras_model(model, TFJS_DIR)
    # Texto sin emoji
    print(f"--- Modelo exportado a TensorFlow.js en: {TFJS_DIR}")
except Exception as e:
    print(f"--- Error al exportar a TensorFlow.js: {e}") 

# -----------------------------
# 11️⃣ Graficar historial
# -----------------------------
acc = history.history.get("accuracy", []) + history_fine.history.get("accuracy", [])
val_acc = history.history.get("val_accuracy", []) + history_fine.history.get("val_accuracy", [])
loss = history.history.get("loss", []) + history_fine.history.get("loss", [])
val_loss = history.history.get("val_loss", []) + history_fine.history.get("val_loss", [])

plt.figure(figsize=(10, 5))
plt.subplot(1, 2, 1)
plt.plot(acc, label="Entrenamiento")
plt.plot(val_acc, label="Validación")
plt.title("Precisión")
plt.xlabel("Épocas")
plt.ylabel("Accuracy")
plt.legend()

plt.subplot(1, 2, 2)
plt.plot(loss, label="Entrenamiento")
plt.plot(val_loss, label="Validación")
plt.title("Pérdida")
plt.xlabel("Épocas")
plt.ylabel("Loss")
plt.legend()

plt.show()