# modelo_2.1.py - Entrenamiento, Fine-tuning y conversión a TFJS y TFLite
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
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, 'dataset_limpio')

if not os.path.exists(DATASET_DIR):
    raise FileNotFoundError(f"No se encontró la carpeta del dataset en: {DATASET_DIR}")

# -----------------------------
# 2️⃣ Generadores de imágenes
# -----------------------------
datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2,
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
# 3️⃣ Modelo Transfer Learning
# -----------------------------
base_model = MobileNetV2(input_shape=(224,224,3), include_top=False, weights='imagenet')
base_model.trainable = False

x = base_model.output
x = GlobalAveragePooling2D()(x)
x = Dense(128, activation='relu')(x)
output = Dense(NUM_CLASSES, activation='softmax')(x)

model = Model(inputs=base_model.input, outputs=output)

# -----------------------------
# 4️⃣ Compilación
# -----------------------------
model.compile(optimizer=Adam(learning_rate=LEARNING_RATE),
              loss='categorical_crossentropy',
              metrics=['accuracy'])

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
# 6️⃣ Entrenamiento inicial
# -----------------------------
history = model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=EPOCHS,
    callbacks=[checkpoint, early_stop],
    verbose=1
)

# -----------------------------
# 7️⃣ Fine-tuning
# -----------------------------
base_model.trainable = True
for layer in base_model.layers[:100]:
    layer.trainable = False

model.compile(
    optimizer=Adam(learning_rate=LEARNING_RATE/10),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

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
model.save('modelo_IA_v2.h5')
print("✅ Entrenamiento completado. Modelo guardado como modelo_IA_v2.h5")

# -----------------------------
# 8️⃣b Convertir a TensorFlow Lite
# -----------------------------
try:
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]  # optimización opcional
    tflite_model = converter.convert()
    tflite_path = os.path.join(BASE_DIR, 'modelo_final.tflite')
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)
    print(f"✅ Modelo convertido a TFLite: {tflite_path}")
except Exception as e:
    print(f"⚠️ Error al convertir a TFLite: {e}")

# -----------------------------
# 9️⃣ Convertir modelo a TensorFlow.js
# -----------------------------
try:
    import tensorflowjs as tfjs
    TFJS_DIR = os.path.join(BASE_DIR, 'modelo_tfjs')
    modelo_ia = tf.keras.models.load_model('modelo_IA_v2.h5')
    tfjs.converters.save_keras_model(modelo_ia, TFJS_DIR)
    print(f"✅ Modelo convertido a TFJS en: {TFJS_DIR}")
except ImportError:
    print("⚠️ No se encontró tensorflowjs. Instálalo con 'pip install tensorflowjs'")

# -----------------------------
# 🔟 Graficar historial de entrenamiento
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