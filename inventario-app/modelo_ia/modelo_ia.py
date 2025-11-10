# -*- coding: utf-8 -*-
"""
modelo_ia_max_precision.py
---------------------------------------
Entrenamiento optimizado para clasificación de productos
...
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
IMG_SIZE = (224, 224) 			# Tamaño de entrada
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

# Validar estructura mínima
for subdir in ["train", "val", "test"]:
    path = os.path.join(DATASET_DIR, subdir)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing folder: {path}")

# -----------------------------
# Data Generators
# -----------------------------
# Usamos la función de preprocesado de MobileNetV2 para obtener [-1, 1]
preprocess_fn = tf.keras.applications.mobilenet_v2.preprocess_input

train_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_fn,
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

val_datagen = ImageDataGenerator(preprocessing_function=preprocess_fn)
test_datagen = ImageDataGenerator(preprocessing_function=preprocess_fn)

train_generator = train_datagen.flow_from_directory(
    os.path.join(DATASET_DIR, "train"),
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    shuffle=True
)

val_generator = val_datagen.flow_from_directory(
    os.path.join(DATASET_DIR, "val"),
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    shuffle=False
)

test_generator = test_datagen.flow_from_directory(
    os.path.join(DATASET_DIR, "test"),
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode="categorical",
    shuffle=False
)

# -----------------------------
# Class weights (mapeo correcto a índices)
# -----------------------------
labels = train_generator.classes  # array con índices de clase
classes_unique = np.unique(labels)
weights = compute_class_weight(class_weight="balanced", classes=classes_unique, y=labels)
# build dict {class_index: weight}
class_weights = {int(c): float(w) for c, w in zip(classes_unique, weights)}
print("Class weights:", class_weights)

# -----------------------------
# Build model (MobileNetV2 backbone)
# -----------------------------
# MobileNetV2 espera entradas en [-1,1] -> usamos preprocess_input en los generadores
base_model = MobileNetV2(input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3), include_top=False, weights="imagenet")
base_model.trainable = False  # freeze initially

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = BatchNormalization()(x)
x = Dense(512, activation="relu", kernel_regularizer=regularizers.l2(1e-4))(x)
x = Dropout(0.5)(x)
x = Dense(256, activation="relu", kernel_regularizer=regularizers.l2(1e-4))(x)
x = Dropout(0.3)(x)
# 🚨 CORRECCIÓN CLAVE: Nombrar explícitamente la capa de salida.
outputs = Dense(NUM_CLASSES, activation="softmax", name="prediction_output")(x)

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
base_model.trainable = True

# Freeze first N layers, allow rest to train.
freeze_until = 100  # tweak this number if needed
for layer in base_model.layers[:freeze_until]:
    layer.trainable = False
for layer in base_model.layers[freeze_until:]:
    layer.trainable = True

# Recompile with lower LR for fine-tuning
ft_optimizer = Adam(learning_rate=BASE_LR / 10.0)
model.compile(optimizer=ft_optimizer, loss=loss_fn, metrics=["accuracy"])

# Continue training (ensure initial_epoch safe)
initial_epoch = history.epoch[-1] + 1 if hasattr(history, "epoch") and len(history.epoch) > 0 else 0
history_fine = model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=initial_epoch + EPOCHS + FINE_TUNE_EPOCHS,
    initial_epoch=initial_epoch,
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
# Save labels.txt (ordered by class index)
# -----------------------------
label_map = {v: k for k, v in train_generator.class_indices.items()}
labels_ordered = [label_map[i] for i in range(len(label_map))]
labels_path = os.path.join(SAVE_DIR, "labels.txt")
with open(labels_path, "w", encoding="utf-8") as f:
    f.write("\n".join(labels_ordered))
print("Saved labels:", labels_path, labels_ordered)

# -----------------------------
# Export to TensorFlow Lite (float32) + try to add metadata for classification
# -----------------------------
try:
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    # Keep as float32 to avoid quantization issues for tfjs-tflite
    converter.optimizations = []
    converter.target_spec.supported_types = [tf.float32]
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

    # Run a real inference on one batch from test_generator to validate
    try:
        x_batch, y_batch = next(test_generator)
        # x_batch already preprocessed by preprocess_input -> in [-1,1]
        x_batch = x_batch.astype(np.float32)
        interpreter.set_tensor(input_details[0]["index"], x_batch[:1])
        interpreter.invoke()
        out = interpreter.get_tensor(output_details[0]["index"])
        print("Sample inference output shape:", out.shape, "values:", out)
    except Exception as ex_inf:
        print("Warning: could not run sample inference with test_generator:", ex_inf)

    # Try to attach metadata (labels) using tflite-support if available
    try:
        from tflite_support.metadata_writers import image_classifier
        from tflite_support.metadata_writers import writer_utils

        model_buf = writer_utils.load_file(TFLITE_PATH)
        # input_norm_mean/std should reflect preprocessing: MobileNetV2 preprocess_input maps to [-1,1]
        writer = image_classifier.MetadataWriter.create_for_inference(
            model_buf,
            input_norm_mean=[0.0],
            input_norm_std=[1.0],
            label_file_paths=[labels_path]
        )
        metadata_buf = writer.populate()
        writer_utils.save_file(metadata_buf, TFLITE_PATH)
        print("✅ Metadata added to TFLite model (classify() ready).")
    except Exception as meta_e:
        # ⚠️ Aviso: Si tflite-support falla, esto no es un problema para tfjs-tflite si usas predict() y labels.txt
        print("⚠️ Could not add metadata (tflite-support not installed or error). Details:", meta_e)

except Exception as e:
    print("Error converting to TFLite:", e)

# -----------------------------
# Optional: Export to TensorFlow.js
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
# Plot training history (robusto)
# -----------------------------
# safe concatenation of histories
acc_train = history.history.get("accuracy", []) if history and hasattr(history, "history") else []
acc_fine = history_fine.history.get("accuracy", []) if history_fine and hasattr(history_fine, "history") else []
val_train = history.history.get("val_accuracy", []) if history and hasattr(history, "history") else []
val_fine = history_fine.history.get("val_accuracy", []) if history_fine and hasattr(history_fine, "history") else []

loss_train = history.history.get("loss", []) if history and hasattr(history, "history") else []
loss_fine = history_fine.history.get("loss", []) if history_fine and hasattr(history_fine, "history") else []
val_loss_train = history.history.get("val_loss", []) if history and hasattr(history, "history") else []
val_loss_fine = history_fine.history.get("val_loss", []) if history_fine and hasattr(history_fine, "history") else []

acc = acc_train + acc_fine
val_acc = val_train + val_fine
loss = loss_train + loss_fine
val_loss = val_loss_train + val_loss_fine

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