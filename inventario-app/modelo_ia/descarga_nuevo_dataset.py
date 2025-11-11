import os
import shutil
import time  # Necesario para las pausas entre búsquedas
from icrawler.builtin import GoogleImageCrawler

# --- Configuración de Rutas ---

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Directorio FINAL para el re-entrenamiento
OUTPUT_DIR_FINAL = "nuevos_datos_entrenamiento"
FINAL_PATH = os.path.join(BASE_DIR, OUTPUT_DIR_FINAL)

# --- Configuración de Descarga (LÍMITE Y QUERIES AMPLIADAS) ---

# Parámetros de descarga
LIMIT_PER_CLASS_MAX = 500  # Máximo total a intentar descargar por clase
PAUSA_ENTRE_QUERIES = 2.5  # Pausa para evitar el bloqueo de IP

CLASSES = {
    # CLASE 1: NUEVO - Incluye Impresoras, Tóneres, Celulares, Monitores, Torres.
    "nuevo": [
        "brand new computer monitor realistic photo", "unboxing new printer photo", "new toner cartridge sealed box",
        "new smartphone sealed box", "brand new PC tower packaging", "new electronics store display",
        "computadora nueva en caja foto", "monitor nuevo sin abrir", "impresora nueva sellada",
        "toner nuevo en caja foto", "celular nuevo caja sellada", "torre de PC nueva sin uso",
        "new electronics unboxing realistic", "new desktop computer photo", "new keyboard still in plastic",
        "impresora láser nueva foto real", "monitor led nuevo embalaje", "caja de tóner sin abrir",
    ],

    # CLASE 2: USADO - Incluye marcas de uso en todos los productos.
    "usado": [
        "used computer monitor on desk photo", "old printer with dust", "used toner cartridge nearly empty",
        "used smartphone with wear marks", "used PC tower on floor dusty", "second hand computer setup photo",
        "computadora usada en escritorio foto", "monitor usado con pequeñas raspaduras", "impresora usada funcionando",
        "cartucho de tóner usado foto", "celular usado con marcas de uso", "torre de PC usada en buen estado",
        "used keyboard with worn keys", "old monitor with scratches", "used desktop setup at home office",
        "impresora de segunda mano", "monitor viejo en oficina", "toner vacío usado",
    ],

    # CLASE 3: MAL ESTADO - Incluye daños severos en todos los productos.
    "mal_estado": [
        "broken computer monitor cracked screen", "damaged printer missing parts", "leaking toner cartridge photo",
        "broken smartphone shattered glass", "burnt pc components photo", "damaged desktop tower dented dusty",
        "monitor roto pantalla quebrada", "impresora dañada necesita reparación", "tóner derramado roto",
        "celular con pantalla rota foto real", "torre de pc golpeada oxidada", "electrónica dañada en taller reparación",
        "burnt graphics card photo", "damaged hard drive photo", "electronics with corrosion photo",
        "impresora con grietas rotas", "monitor averiado con rayas", "cartucho de tóner roto",
    ]
}

# --- 1. Función de Descarga (MODIFICADA para incluir la pausa) ---

def download_images_icrawler(classes_queries, total_limit, final_dir):
    """
    Descarga imágenes para cada clase, iterando sobre la lista de queries 
    e incluyendo una PAUSA para evitar el bloqueo de IP.
    """
    
    if os.path.exists(final_dir):
        shutil.rmtree(final_dir)
    os.makedirs(final_dir)
    print(f"Directorio de descarga final creado: {final_dir}")
    
    for class_name, queries in classes_queries.items():
        storage_path = os.path.join(final_dir, class_name)
        
        # Objetivo de 50 imágenes por query para asegurar un buen resultado (50 * ~30 queries = 1500 descargas, que compensa fallos)
        limit_per_query_target = 50 
        
        print(f"\n[Buscando] Clase: {class_name}. Límite por query: {limit_per_query_target}. Objetivo total: {total_limit}")
        
        for query in queries:
            print(f"  > Query: '{query}'")
            crawler = GoogleImageCrawler(
                downloader_threads=4,
                storage={'root_dir': storage_path}
            )
            # min_size bajado a 150x150 para aceptar más imágenes válidas.
            crawler.crawl(keyword=query, max_num=limit_per_query_target, min_size=(150, 150))
            
            # PAUSA CRÍTICA para evitar el bloqueo
            time.sleep(PAUSA_ENTRE_QUERIES) 
            
        print(f"Descarga de '{class_name}' completada.")


# --- 2. Función de Limpieza Técnica (Mejorada, se mantiene) ---

def clean_dataset(final_dir, classes):
    """Realiza la limpieza técnica: elimina archivos no-imagen y de tamaño cero."""
    print(f"\n[Limpieza] Iniciando limpieza técnica en: {final_dir}")
    
    valid_extensions = ('.jpg', '.jpeg', '.png')
    total_cleaned = 0

    for class_name in classes.keys():
        class_path = os.path.join(final_dir, class_name)
        
        if not os.path.exists(class_path):
            continue
            
        for filename in os.listdir(class_path):
            file_path = os.path.join(class_path, filename)
            
            if not os.path.isfile(file_path):
                continue
                
            # FILTRO COMPLETO: Comprobar que termine en extensión válida Y que el tamaño sea > 0
            is_valid_file = filename.lower().endswith(valid_extensions) and os.path.getsize(file_path) > 0
            
            if not is_valid_file:
                os.remove(file_path)
                total_cleaned += 1
                
    print(f"Archivos basura (no-imagen o tamaño cero) eliminados: {total_cleaned}")

# --- Ejecución Principal ---

if __name__ == "__main__":
    
    # 1. Descarga de imágenes
    download_images_icrawler(CLASSES, LIMIT_PER_CLASS_MAX, FINAL_PATH)
    
    # 2. Limpieza de archivos corruptos o de tamaño cero
    clean_dataset(FINAL_PATH, CLASSES)
    
    print("\n--- ¡PROCESO AUTOMÁTICO TERMINADO! ---")
    print(f"La carpeta '{OUTPUT_DIR_FINAL}' contiene las imágenes de diversos productos.")
    print("\n")
    print("Paso CRÍTICO: REVISA MANUALMENTE la carpeta para eliminar IMÁGENES AMBIGUAS o de MALA CALIDAD.")
    print("Solo después de la revisión humana, ejecuta 're-entreno_modelo.py'.")