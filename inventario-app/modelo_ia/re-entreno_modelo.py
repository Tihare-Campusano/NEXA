import os
import shutil
from google_images_download import googleimagesdownload

# --- Configuración de Rutas ---

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Directorio de DESCARGA temporal (para el scraping)
OUTPUT_DIR_TEMPORAL = "dataset_descargado_temp"
DOWNLOAD_PATH = os.path.join(BASE_DIR, OUTPUT_DIR_TEMPORAL)

# Directorio FINAL para el re-entrenamiento (como lo necesita el otro script)
OUTPUT_DIR_FINAL = "nuevos_datos_entrenamiento"
FINAL_PATH = os.path.join(BASE_DIR, OUTPUT_DIR_FINAL)

# --- Configuración de Descarga ---

CLASSES = {
    "nuevo": "producto nuevo sin abrir, empaque sellado",
    "usado": "producto usado en buen estado, sin daños graves",
    "mal_estado": "producto roto, caja dañada, producto defectuoso",
}

# Parámetros de descarga aumentados
LIMIT_PER_CLASS = 300  # Máximo a intentar descargar por clase
IMAGE_SIZE = "medium"  # Preferir calidad media/alta

# --- 1. Función de Descarga ---

def download_images(classes, limit, output_dir, size):
    """Descarga imágenes para cada clase."""
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir) # Eliminar descargas anteriores si existen
    os.makedirs(output_dir)
    print(f"Directorio de descarga temporal creado: {output_dir}")
    
    response = googleimagesdownload.googleimagesdownload()
    
    for class_name, keywords in classes.items():
        print(f"\n[Buscando] Clase: {class_name}...")
        
        arguments = {
            "keywords": keywords,
            "limit": limit,
            "output_directory": output_dir,
            "label": class_name, 
            "size": size,
            "print_urls": False,
            "silent_mode": True
        }
        
        try:
            response.download(arguments)
            print(f"Descarga de '{class_name}' completada.")
        except Exception as e:
            print(f"Error al descargar imágenes para {class_name}: {e}")

# --- 2. Función de Limpieza y Movimiento Automático ---

def clean_and_move_dataset(temp_dir, final_dir, classes):
    """Elimina archivos rotos/inútiles y mueve los datos limpios a la carpeta final."""
    
    if os.path.exists(final_dir):
        shutil.rmtree(final_dir) # Eliminar carpeta final anterior
    os.makedirs(final_dir)
    print(f"\n[Limpieza] Iniciando limpieza y traslado a: {final_dir}")
    
    valid_extensions = ('.jpg', '.jpeg', '.png')
    total_cleaned = 0
    total_moved = 0

    for class_name in classes.keys():
        temp_class_path = os.path.join(temp_dir, class_name)
        final_class_path = os.path.join(final_dir, class_name)
        
        if not os.path.exists(temp_class_path):
            continue
            
        os.makedirs(final_class_path, exist_ok=True)
        
        for filename in os.listdir(temp_class_path):
            file_path = os.path.join(temp_class_path, filename)
            
            # FILTRO 1: Ignorar archivos no imagen y archivos de tamaño cero
            if filename.lower().endswith(valid_extensions) and os.path.getsize(file_path) > 0:
                shutil.move(file_path, os.path.join(final_class_path, filename))
                total_moved += 1
            else:
                os.remove(file_path) # Eliminar archivos inútiles o vacíos
                total_cleaned += 1
                
        # Eliminar carpeta temporal vacía
        shutil.rmtree(temp_class_path)

    # Eliminar directorio temporal si queda vacío
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
        
    print(f"Archivos basura eliminados: {total_cleaned}")
    print(f"Archivos limpios trasladados: {total_moved}")
    print("El directorio temporal ha sido eliminado.")


# --- Ejecución Principal ---

if __name__ == "__main__":
    
    # 1. Descarga de imágenes
    download_images(CLASSES, LIMIT_PER_CLASS, DOWNLOAD_PATH, IMAGE_SIZE)
    
    # 2. Limpieza automática de archivos y movimiento
    clean_and_move_dataset(DOWNLOAD_PATH, FINAL_PATH, CLASSES)
    
    print("\n--- ¡PROCESO AUTOMÁTICO TERMINADO! ---")
    print("La carpeta 'nuevos_datos_entrenamiento' contiene los archivos limpios.")
    print("Paso Final: REVISA MANUALMENTE la carpeta para eliminar IMÁGENES AMBIGUAS o de MALA CALIDAD.")
    print("Luego, puedes ejecutar 're-entreno_modelo.py'.")