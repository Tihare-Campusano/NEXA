# -*- coding: utf-8 -*-
"""
modelo_ia_max_precision_RAPIDO.py
---------------------------------------
Automatización del entrenamiento, optimización y exportación del modelo de clasificación
de productos (nuevo, usado, mal estado) utilizando TensorFlow y Keras.
Arquitectura base: MobileNetV2 (preentrenada en ImageNet) con Transfer Learning.
Optimizaciones incluidas:
- Data Augmentation avanzado
- Pesos de clase para datasets desequilibrados
- Regularización L2 y Dropout
- Entrenamiento en dos fases: Head Training y Fine-Tuning
- Exportación final a Keras (.h5) y TensorFlow Lite (.tflite)
Objetivo: precisión 80-90% para la clasificación de productos.
"""
import os
import tensorflow as tf
import numpy as np
import matplotlib.pyplot as plt
import sys

# Configuración opcional para codificación de consola
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping, ReduceLROnPlateau, CSVLogger
from tensorflow.keras import regularizers
from sklearn.utils.class_weight import compute_class_weight

# -----------------------------
# CONFIGURACIÓN DEL ENTRENAMIENTO
# -----------------------------
IMG_SIZE = (224, 224)
BATCH_SIZE = 64
EPOCHS = 40
FINE_TUNE_EPOCHS = 30
BASE_LR = 1e-4

# Rutas
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset_limpio")
SAVE_DIR = BASE_DIR

print("Dataset directory:", DATASET_DIR)
print("Save directory:", SAVE_DIR)

# Validar estructura mínima
for subdir in ["train", "val", "test"]:
    path = os.path.join(DATASET_DIR, subdir)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Missing folder: {path}. Run preparar_dataset_optimizado.py first.")

# -----------------------------
# DATA GENERATORS CON DATA AUGMENTATION
# -----------------------------
preprocess_fn = tf.keras.applications.mobilenet_v2.preprocess_input

# Generador de entrenamiento con aumento de datos avanzado
train_datagen = ImageDataGenerator(
    preprocessing_function=preprocess_fn,
    rotation_range=35,
    width_shift_range=0.20,
    height_shift_range=0.20,
    shear_range=0.20,
    zoom_range=[0.8, 1.2],
    brightness_range=[0.7, 1.3],
    channel_shift_range=20.0,
    horizontal_flip=True,
    vertical_flip=False,
    fill_mode="nearest"
)

# Generador de validación y prueba sin aumento
val_test_datagen = ImageDataGenerator(preprocessing_function=preprocess_fn)

def main():
    # -----------------------------
    # CARGA DE DATOS
    # -----------------------------
    train_generator = train_datagen.flow_from_directory(
        os.path.join(DATASET_DIR, "train"),
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        shuffle=True
    )
    val_generator = val_test_datagen.flow_from_directory(
        os.path.join(DATASET_DIR, "val"),
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        shuffle=False
    )
    test_generator = val_test_datagen.flow_from_directory(
        os.path.join(DATASET_DIR, "test"),
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        shuffle=False
    )

    NUM_CLASSES = train_generator.num_classes
    print(f"Número de Clases Detectadas: {NUM_CLASSES}")

    # -----------------------------
    # CÁLCULO DE PESOS DE CLASE PARA MITIGAR DESEQUILIBRIO
    # -----------------------------
    labels = train_generator.classes
    classes_unique = np.unique(labels)
    weights = compute_class_weight(class_weight="balanced", classes=classes_unique, y=labels)
    class_weights = {int(c): float(w) for c, w in zip(classes_unique, weights)}
    print("Class weights (para mitigar desequilibrio):", class_weights)

    # -----------------------------
    # CONSTRUCCIÓN DEL MODELO (MobileNetV2 + Head Personalizado)
    # -----------------------------
    base_model = MobileNetV2(input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3),
                             include_top=False,
                             weights="imagenet")
    base_model.trainable = False  # Fase 1: Head Training

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = BatchNormalization()(x)
    x = Dense(512, activation="relu", kernel_regularizer=regularizers.l2(1e-3))(x)
    x = Dropout(0.3)(x)
    x = Dense(256, activation="relu", kernel_regularizer=regularizers.l2(1e-3))(x)
    x = Dropout(0.2)(x)
    outputs = Dense(NUM_CLASSES, activation="softmax")(x)

    model = Model(inputs=base_model.input, outputs=outputs)

    # -----------------------------
    # COMPILACIÓN
    # -----------------------------
    loss_fn = tf.keras.losses.CategoricalCrossentropy(label_smoothing=0.1)
    optimizer = Adam(learning_rate=BASE_LR)
    model.compile(optimizer=optimizer, loss=loss_fn, metrics=["accuracy"])
    model.summary()

    # -----------------------------
    # CALLBACKS
    # -----------------------------
    checkpoint_path = os.path.join(SAVE_DIR, "modelo_mejor_max_rapido.h5")
    csv_log_path = os.path.join(SAVE_DIR, "metricas_entrenamiento_rapido.csv")

    callbacks = [
        ModelCheckpoint(checkpoint_path, monitor="val_accuracy", save_best_only=True, verbose=1),
        EarlyStopping(monitor="val_loss", patience=8, restore_best_weights=True, verbose=1),
        ReduceLROnPlateau(monitor="val_loss", factor=0.3, patience=5, min_lr=1e-6, verbose=1),
        CSVLogger(csv_log_path, append=True)
    ]

    # -----------------------------
    # FASE 1: ENTRENAMIENTO DEL HEAD
    # -----------------------------
    print("\n--- FASE 1: Entrenamiento del Head ---")
    history = model.fit(
        train_generator,
        validation_data=val_generator,
        epochs=EPOCHS,
        class_weight=class_weights,
        callbacks=callbacks,
        verbose=1
    )

    # -----------------------------
    # FASE 2: FINE-TUNING (Descongelando capas superiores)
    # -----------------------------
    base_model.trainable = True
    freeze_until = 50  # Congelar las primeras 50 capas
    for layer in base_model.layers[:freeze_until]:
        layer.trainable = False

    ft_optimizer = Adam(learning_rate=BASE_LR / 20.0)
    model.compile(optimizer=ft_optimizer, loss=loss_fn, metrics=["accuracy"])

    print(f"\n--- FASE 2: Fine-Tuning (Descongelando {len(base_model.layers) - freeze_until} capas) ---")
    initial_epoch = history.epoch[-1] + 1
    history_fine = model.fit(
        train_generator,
        validation_data=val_generator,
        epochs=initial_epoch + FINE_TUNE_EPOCHS,
        initial_epoch=initial_epoch,
        class_weight=class_weights,
        callbacks=callbacks,
        verbose=1
    )

    # -----------------------------
    # EVALUACIÓN Y EXPORTACIÓN
    # -----------------------------
    print("\n--- Evaluación en set de prueba ---")
    test_loss, test_acc = model.evaluate(test_generator, verbose=1)
    print(f"Precisión final en test: {test_acc*100:.2f}%")

    MODEL_H5_PATH = os.path.join(SAVE_DIR, "modelo_final_rapido.h5")
    model.save(MODEL_H5_PATH)
    print("Modelo Keras guardado:", MODEL_H5_PATH)

    # Guardar etiquetas
    label_map = {v: k for k, v in train_generator.class_indices.items()}
    labels_ordered = [label_map[i] for i in range(len(label_map))]
    labels_path = os.path.join(SAVE_DIR, "labels_rapido.txt")
    with open(labels_path, "w", encoding="utf-8") as f:
        f.write("\n".join(labels_ordered))
    print("Etiquetas guardadas:", labels_path, labels_ordered)

    # Exportar a TensorFlow Lite
    try:
        converter = tf.lite.TFLiteConverter.from_keras_model(model)
        converter.optimizations = []
        converter.target_spec.supported_types = [tf.float32]
        tflite_model = converter.convert()
        TFLITE_PATH = os.path.join(SAVE_DIR, "modelo_final_rapido.tflite")
        with open(TFLITE_PATH, "wb") as f:
            f.write(tflite_model)
        print("Modelo TFLite guardado:", TFLITE_PATH)
    except Exception as e:
        print("Error al convertir a TFLite:", e)

    # -----------------------------
    # PLOT TRAINING HISTORY
    # -----------------------------
    acc = history.history["accuracy"] + history_fine.history["accuracy"]
    val_acc = history.history["val_accuracy"] + history_fine.history["val_accuracy"]
    loss = history.history["loss"] + history_fine.history["loss"]
    val_loss = history.history["val_loss"] + history_fine.history["val_loss"]

    plt.figure(figsize=(10,5))
    plt.subplot(1,2,1)
    plt.plot(acc,label="train")
    plt.plot(val_acc,label="val")
    plt.title("Accuracy")
    plt.xlabel("Epoch")
    plt.ylabel("Accuracy")
    plt.legend()

    plt.subplot(1,2,2)
    plt.plot(loss,label="train")
    plt.plot(val_loss,label="val")
    plt.title("Loss")
    plt.xlabel("Epoch")
    plt.ylabel("Loss")
    plt.legend()

    plt.tight_layout()
    plt.show()

    print(f"\nMétricas guardadas automáticamente en: {csv_log_path}")

if __name__ == "__main__":
    main()