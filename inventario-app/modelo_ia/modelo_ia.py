# -*- coding: utf-8 -*-
"""
modelo_ia_max_precision.py
---------------------------------------
Entrenamiento optimizado para clasificación de productos
Mejoras incluidas:
 - MobileNetV2 base pretrained (imagenet)
 - L2 regularization en densas
 - BatchNormalization + Dropout
 - Label smoothing
 - Class weights calculados automáticamente
 - Fine-tuning profundo (descongela capas superiores)
 - Exportación y validación TFLite (forma/outputs)
Compatibilidad: TensorFlow 2.15+
"""

import os
import tensorflow as tf
import numpy as np
import matplotlib.pyplot as plt

from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau
from tensorflow.keras import regularizers
from sklearn.utils.class_weight import compute_class_weight

# -----------------------------
# Configuración
# -----------------------------
IMG_SIZE = (224, 224)           # Cambia a (256,256) si tienes GPU y memoria
BATCH_SIZE = 32
EPOCHS = 40
FINE_TUNE_EPOCHS = 30
NUM_CLASSES = 3
BASE_LR = 1e-4

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset_limpio")
SAVE_DIR = BASE_DIR

print("Dataset directory:", DATASET_DIR)
print("Save directory:", SAVE_DIR)

# Validar estructura
for subdir in ["train", "val", "test"]:
    path = os.path.join(DATASET_DIR, subdir)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing folder: {path}")

# -----------------------------
# Data Generators
# -----------------------------
train_datagen = ImageDataGenerator(
    rescale=1.0 / 255.0,
    rotation_range=35,
    width_shift_range=0.25,
    height_shift_range=0.25,
    shear_range=0.25,
    zoom_range=[0.75, 1.25],
    brightness_range=[0.6, 1.4],
    channel_shift_range=30.0,
    horizontal_flip=True,
    vertical_flip=False,
    fill_mode="reflect"
)

val_datagen = ImageDataGenerator(rescale=1.0 / 255.0)
test_datagen = ImageDataGenerator(rescale=1.0 / 255.0)

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
# Class weights
# -----------------------------
labels = train_generator.classes
class_weights_vals = compute_class_weight(
    class_weight="balanced",
    classes=np.unique(labels),
    y=labels
)
class_weights = dict(enumerate(class_weights_vals))
print("Class weights:", class_weights)

# -----------------------------
# Build model (MobileNetV2 backbone)
# -----------------------------
base_model = MobileNetV2(input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3), include_top=False, weights="imagenet")
base_model.trainable = False  # freeze initially

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = BatchNormalization()(x)
x = Dense(512, activation="relu", kernel_regularizer=regularizers.l2(1e-4))(x)
x = Dropout(0.5)(x)
x = Dense(256, activation="relu", kernel_regularizer=regularizers.l2(1e-4))(x)
x = Dropout(0.3)(x)
outputs = Dense(NUM_CLASSES, activation="softmax")(x)

model = Model(inputs=base_model.input, outputs=outputs)

# -----------------------------
# Compile with label smoothing
# -----------------------------
loss_fn = tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.1)
optimizer = Adam(learning_rate=BASE_LR)

model.compile(optimizer=optimizer, loss=loss_fn, metrics=["accuracy"])
model.summary()

# -----------------------------
# Callbacks
# -----------------------------
checkpoint_path = os.path.join(SAVE_DIR, "modelo_mejor_max.h5")
callbacks = [
    ModelCheckpoint(checkpoint_path, monitor="val_accuracy", save_best_only=True, verbose=1),
    EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True, verbose=1),
    ReduceLROnPlateau(monitor="val_loss", factor=0.3, patience=4, min_lr=1e-6, verbose=1)
]

# -----------------------------
# Initial training (head)
# -----------------------------
history = model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=EPOCHS,
    class_weight=class_weights,
    callbacks=callbacks,
    verbose=1
)

# -----------------------------
# Fine-tuning: unfreeze top layers of base_model
# -----------------------------
# Unfreeze the top layers to allow fine-tuning on our dataset.
base_model.trainable = True

# Freeze first N layers, allow rest to train.
# For MobileNetV2, freeing later layers helps capture task-specific features.
freeze_until = 100  # freeze layers up to this index (tweakable)
for layer in base_model.layers[:freeze_until]:
    layer.trainable = False
for layer in base_model.layers[freeze_until:]:
    layer.trainable = True

# Recompile with lower LR for fine-tuning
ft_optimizer = Adam(learning_rate=BASE_LR / 10.0)
model.compile(optimizer=ft_optimizer, loss=loss_fn, metrics=["accuracy"])

# Continue training
history_fine = model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=EPOCHS + FINE_TUNE_EPOCHS,
    initial_epoch=history.epoch[-1] + 1,
    class_weight=class_weights,
    callbacks=callbacks,
    verbose=1
)

# -----------------------------
# Evaluate on test set
# -----------------------------
test_loss, test_acc = model.evaluate(test_generator, verbose=1)
print("Final test accuracy: {:.2f}%".format(test_acc * 100.0))

# Save final Keras model
MODEL_H5_PATH = os.path.join(SAVE_DIR, "modelo_final.h5")
model.save(MODEL_H5_PATH)
print("Saved model (h5):", MODEL_H5_PATH)

# -----------------------------
# Export to TensorFlow Lite (ensure float32)
# -----------------------------
try:
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    # Force float32 to avoid quantization artifacts that tfjs-tflite may not like
    converter.target_spec.supported_types = [tf.float32]
    converter.experimental_new_converter = True

    tflite_model = converter.convert()
    TFLITE_PATH = os.path.join(SAVE_DIR, "modelo_final.tflite")
    with open(TFLITE_PATH, "wb") as f:
        f.write(tflite_model)
    print("Saved TFLite model:", TFLITE_PATH)

    # Validate interpreter input/output details
    interpreter = tf.lite.Interpreter(model_content=tflite_model)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    print("TFLite input details:", input_details)
    print("TFLite output details:", output_details)

except Exception as e:
    print("Error converting to TFLite:", e)

# -----------------------------
# Export to TensorFlow.js (optional)
# -----------------------------
try:
    import tensorflowjs as tfjs
    TFJS_DIR = os.path.join(SAVE_DIR, "modelo_tfjs")
    os.makedirs(TFJS_DIR, exist_ok=True)
    tfjs.converters.save_keras_model(model, TFJS_DIR)
    print("Saved TFJS model to:", TFJS_DIR)
except Exception as e:
    print("Could not export to TFJS:", e)

# -----------------------------
# Plot training history
# -----------------------------
acc = history.history.get("accuracy", []) + history_fine.history.get("accuracy", [])
val_acc = history.history.get("val_accuracy", []) + history_fine.history.get("val_accuracy", [])
loss = history.history.get("loss", []) + history_fine.history.get("loss", [])
val_loss = history.history.get("val_loss", []) + history_fine.history.get("val_loss", [])

plt.figure(figsize=(10, 5))
plt.subplot(1, 2, 1)
plt.plot(acc, label="train")
plt.plot(val_acc, label="val")
plt.title("Accuracy")
plt.xlabel("Epoch")
plt.ylabel("Accuracy")
plt.legend()

plt.subplot(1, 2, 2)
plt.plot(loss, label="train")
plt.plot(val_loss, label="val")
plt.title("Loss")
plt.xlabel("Epoch")
plt.ylabel("Loss")
plt.legend()

plt.tight_layout()
plt.show()