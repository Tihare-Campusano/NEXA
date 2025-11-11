import os
from google_images_download import googleimagesdownload

# --- Configuración de Descarga ---

# Directorio de salida: se recomienda usar una carpeta nueva
OUTPUT_DIR = "dataset_descargado"
# Rutas relativas al directorio donde se ejecuta este script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_PATH = os.path.join(BASE_DIR, OUTPUT_DIR)

# Crea el directorio si no existe
if not os.path.exists(DOWNLOAD_PATH):
    os.makedirs(DOWNLOAD_PATH)
    print(f"Directorio de descarga creado: {DOWNLOAD_PATH}")

# Palabras clave a buscar para cada una de tus clases
# Define búsquedas específicas para reducir la ambigüedad
CLASSES = {
    # CLASE 1: NUEVO - Ampliamos para incluir empaques en distintos ángulos y condiciones "mint".
    "nuevo": "producto nuevo, sin abrir, empaque sellado, embalaje perfecto, listo para venta, estado mint", 
    
    # CLASE 2: USADO - Buscamos señales claras de uso diario sin ser defectos graves.
    "usado": "producto usado en buen estado, con marcas de uso, de segunda mano, pequeñas raspaduras, uso diario, buen cuidado", 
    
    # CLASE 3: MAL ESTADO - Buscamos daños obvios, fallos y deterioro severo.
    "mal_estado": "producto roto, caja dañada, producto defectuoso, con grietas, gravemente deteriorado, falla funcional, necesita reparación", 
}

# Parámetros de descarga
LIMIT_PER_CLASS = 100 # Cantidad de imágenes a intentar descargar por clase
IMAGE_SIZE = "medium" # Preferir tamaños medianos a grandes para calidad

# --- Función de Descarga ---

def download_images(classes, limit, output_dir, size):
    """Descarga imágenes para cada clase usando las palabras clave."""
    response = googleimagesdownload.googleimagesdownload()
    
    for class_name, keywords in classes.items():
        print(f"\n[Buscando] Clase: {class_name} con keywords: '{keywords}'")
        
        arguments = {
            "keywords": keywords,
            "limit": limit,
            "output_directory": output_dir,
            "label": class_name, # La carpeta de salida será el nombre de la clase
            "size": size,
            "print_urls": False,
            "silent_mode": True
        }
        
        try:
            # Llama a la función de descarga
            response.download(arguments)
            print(f"Descarga de '{class_name}' completada.")
        except Exception as e:
            print(f"Error al descargar imágenes para {class_name}: {e}")

# --- Ejecución ---

if __name__ == "__main__":
    download_images(CLASSES, LIMIT_PER_CLASS, OUTPUT_DIR, IMAGE_SIZE)
    print("\n--- FINALIZACIÓN DE DESCARGA ---")
    print(f"Ahora, revisa manualmente las imágenes en la carpeta '{OUTPUT_DIR}' para garantizar la calidad y no ambigüedad.")