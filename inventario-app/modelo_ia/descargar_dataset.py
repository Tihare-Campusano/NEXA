# -*- coding: utf-8 -*-
import os
from icrawler.builtin import GoogleImageCrawler

# --- Configuración General ---

# Carpeta base donde se guardará el dataset
BASE_DIR = 'inventario-app/modelo_ia/dataset_inicial'

# Cantidad de imágenes a descargar por tipo de producto
IMGS_POR_PRODUCTO = 40

# Consultas de búsqueda optimizadas para obtener imágenes más relevantes y claras
search_queries = {
    "nuevo": [
        # Monitores y pantallas nuevos
        "new computer monitor on desk high quality photo",
        "brand new lcd computer monitor product photo",
        # Computadores y torres nuevas
        "new desktop computer tower clean background",
        "new gaming pc case studio lighting",
        # Smartphones nuevos
        "brand new smartphone display close up white background",
        "unopened new mobile phone retail photo",
        # Impresoras nuevas
        "brand new printer product photography",
        # Tóneres o cartuchos nuevos
        "new toner cartridge isolated on white background"
    ],
    "usado": [
        # Monitores usados
        "used computer monitor with some dust working on desk",
        "second hand lcd monitor turned on",
        # Computadores usados
        "used desktop computer tower slightly scratched",
        "second hand pc tower working condition photo",
        # Smartphones usados
        "used smartphone on table with minor wear",
        "pre owned mobile phone working screen on",
        # Impresoras usadas
        "used printer on desk showing wear marks",
        # Tóneres usados
        "used toner cartridge half empty photo"
    ],
    "mal_estado": [
        # Monitores rotos
        "broken computer monitor cracked screen close up",
        "damaged lcd monitor black screen with cracks",
        # Computadores dañados
        "broken pc tower damaged case components exposed",
        "burnt desktop computer motherboard damage",
        # Smartphones rotos
        "broken smartphone shattered screen close up",
        "damaged mobile phone not turning on photo",
        # Impresoras dañadas
        "broken printer with error light or paper jam",
        # Tóneres dañados
        "leaking toner cartridge ink spilled photo"
    ]
}

print(f"Iniciando descarga de imagenes de Google en la carpeta base: {BASE_DIR}")

# --- Proceso de Descarga ---

# Iteramos sobre cada categoría (nuevo, usado, mal_estado)
for categoria, queries in search_queries.items():
    # Definimos la carpeta de destino: BASE_DIR/categoria
    carpeta_destino = os.path.join(BASE_DIR, categoria)
    os.makedirs(carpeta_destino, exist_ok=True)

    print(f"\n[INFO] Procesando categoria: {categoria} (Guardando en: {carpeta_destino})")

    # Inicializamos el rastreador de Google para la carpeta de destino
    crawler = GoogleImageCrawler(storage={'root_dir': carpeta_destino})

    # El índice de inicio asegura que la numeración de archivos continúe
    idx_start = 0

    # Iteramos sobre todas las consultas dentro de esta categoría
    for query in queries:
        print(f"   -> Buscando: '{query}' ({IMGS_POR_PRODUCTO} imagenes)")

        # Realizamos la búsqueda (sin min_latency)
        crawler.crawl(
            keyword=query,
            max_num=IMGS_POR_PRODUCTO,
            min_size=(400, 400),  # Mejor calidad
            file_idx_offset=idx_start
        )

        # Actualizamos el índice para la siguiente consulta
        idx_start += IMGS_POR_PRODUCTO

print("\n[OK] Dataset descargado y listo para entrenamiento.")
print(f"El dataset está organizado en:\n - {BASE_DIR}/nuevo\n - {BASE_DIR}/usado\n - {BASE_DIR}/mal_estado\n")