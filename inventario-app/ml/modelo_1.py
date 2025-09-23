# modelo_2.1.py - Versión optimizada con fine-tuning y gráficas
import tensorflow as tf
import os
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
import matplotlib.pyplot as plt

# -----------------------------
# 1️⃣ Configuración
# -----------------------------
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 20
NUM_CLASSES = 3  # nuevo, usado, mal_estado
LEARNING_RATE = 0.0001
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # Carpeta donde está este script
DATASET_DIR = os.path.join(BASE_DIR, 'dataset_limpio')  # Carpeta con tus imágenes

# Verificar que el dataset existe
if not os.path.exists(DATASET_DIR):
    raise FileNotFoundError(f"No se encontró la carpeta del dataset en: {DATASET_DIR}")

# -----------------------------
# 2️⃣ Generadores de imágenes con Data Augmentation y validación automática
# -----------------------------
datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2,  # 80% train, 20% val
    rotation_range=20,
    width_shift_range=0.2,
    height_shift_range=0.2,
    shear_range=0.15,
    zoom_range=0.2,
    horizontal_flip=True,
    fill_mode='nearest'
)

train_generator = datagen.flow_from_directory(
    DATASET_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='training',
    shuffle=True
)

val_generator = datagen.flow_from_directory(
    DATASET_DIR,
    target_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation',
    shuffle=False
)

# -----------------------------
# 3️⃣ Modelo Transfer Learning (MobileNetV2)
# -----------------------------
base_model = MobileNetV2(
    input_shape=(224, 224, 3),
    include_top=False,
    weights='imagenet'
)
base_model.trainable = False  # Congelar la base inicialmente

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(128, activation='relu')(x)
output = Dense(NUM_CLASSES, activation='softmax')(x)

model = Model(inputs=base_model.input, outputs=output)

# -----------------------------
# 4️⃣ Compilación
# -----------------------------
model.compile(
    optimizer=Adam(learning_rate=LEARNING_RATE),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()

# -----------------------------
# 5️⃣ Callbacks
# -----------------------------
checkpoint = ModelCheckpoint(
    'modelo_mejor.h5',
    monitor='val_accuracy',
    save_best_only=True,
    verbose=1
)

early_stop = EarlyStopping(
    monitor='val_loss',
    patience=5,
    restore_best_weights=True,
    verbose=1
)

# -----------------------------
# 6️⃣ Entrenamiento inicial (capas congeladas)
# -----------------------------
history = model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=EPOCHS,
    callbacks=[checkpoint, early_stop],
    verbose=1
)

# -----------------------------
# 7️⃣ Fine-tuning: descongelar algunas capas superiores
# -----------------------------
base_model.trainable = True
for layer in base_model.layers[:100]:  # congelar capas iniciales
    layer.trainable = False

model.compile(
    optimizer=Adam(learning_rate=LEARNING_RATE/10),  # LR más bajo para fine-tuning
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

# Entrenamiento de fine-tuning
fine_tune_epochs = 10
total_epochs = EPOCHS + fine_tune_epochs

history_fine = model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=total_epochs,
    initial_epoch=history.epoch[-1]+1,
    callbacks=[checkpoint, early_stop],
    verbose=1
)

# -----------------------------
# 8️⃣ Guardar modelo final
# -----------------------------
model.save('modelo_final.h5')
print("✅ Entrenamiento completado. Modelo guardado como modelo_final.h5 y el mejor checkpoint en modelo_mejor.h5")

# -----------------------------
# 9️⃣ Graficar historial de entrenamiento
# -----------------------------
acc = history.history['accuracy'] + history_fine.history['accuracy']
val_acc = history.history['val_accuracy'] + history_fine.history['val_accuracy']
loss = history.history['loss'] + history_fine.history['loss']
val_loss = history.history['val_loss'] + history_fine.history['val_loss']

plt.figure(figsize=(10,5))
plt.subplot(1,2,1)
plt.plot(acc, label='Training Accuracy')
plt.plot(val_acc, label='Validation Accuracy')
plt.title('Accuracy')
plt.xlabel('Epochs')
plt.ylabel('Accuracy')
plt.legend()

plt.subplot(1,2,2)
plt.plot(loss, label='Training Loss')
plt.plot(val_loss, label='Validation Loss')
plt.title('Loss')
plt.xlabel('Epochs')
plt.ylabel('Loss')
plt.legend()

plt.show()