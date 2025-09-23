# modelo_2.0.py
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping

# -----------------------------
# 1️⃣ Configuración
# -----------------------------
IMG_SIZE = (224, 224)   # Tamaño recomendado para MobileNetV2
BATCH_SIZE = 32
EPOCHS = 20             # Más épocas, pero EarlyStopping detiene si no mejora
NUM_CLASSES = 3         # nuevo, usado, mal_estado
LEARNING_RATE = 0.0001
DATASET_DIR = "ml/dataset_limpio" # Carpeta con subcarpetas por clase (dataset_inicial)

# -----------------------------
# 2️⃣ Generadores de imágenes con Data Augmentation y validación automática
# -----------------------------
datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2,   # 80% train, 20% val
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
base_model.trainable = False  # congelamos capas base

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
# 6️⃣ Entrenamiento
# -----------------------------
history = model.fit(
    train_generator,
    validation_data=val_generator,
    epochs=EPOCHS,
    callbacks=[checkpoint, early_stop],
    verbose=1
)

# -----------------------------
# 7️⃣ Guardar modelo final
# -----------------------------
model.save('modelo_IA_1.1.h5')
print("✅ Entrenamiento completado. Modelo guardado como modelo_final.h5 y el mejor checkpoint en modelo_mejor.h5")
