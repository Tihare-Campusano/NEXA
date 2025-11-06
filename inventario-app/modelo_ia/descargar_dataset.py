# -*- coding: utf-8 -*-
import os
import hashlib
from icrawler.builtin import GoogleImageCrawler, BingImageCrawler
from PIL import Image, UnidentifiedImageError

# ------------------------------
# CONFIGURACIÓN GENERAL
# ------------------------------
BASE_DIR = 'inventario-app/modelo_ia/dataset_inicial'
IMGS_POR_QUERY = 60  # 🔹 Más imágenes = más diversidad
MIN_SIZE = (400, 400)
CATEGORIAS = ["nuevo", "usado", "mal_estado"]

# ------------------------------
# CONSULTAS MEJORADAS
# ------------------------------
search_queries = {
    "nuevo": [
        "brand new computer monitor on desk high quality photo",
        "new desktop computer tower clean product photo",
        "new smartphone close up on white background",
        "unopened mobile phone retail photo",
        "new printer on table photo",
        "new computer keyboard clean desk",
        "brand new office electronics close up",
        "new gaming pc case studio lighting"
    ],
    "usado": [
        "used computer monitor with dust realistic photo",
        "second hand desktop computer working condition",
        "used smartphone with scratches photo",
        "used printer showing wear realistic photo",
        "used keyboard slightly dirty on desk",
        "used laptop open on desk photo",
        "pre owned pc tower working photo",
        "used electronics office desk photo"
    ],
    "mal_estado": [
        "broken computer monitor cracked screen realistic photo",
        "damaged smartphone shattered glass close up",
        "broken desktop computer tower damaged case",
        "burnt motherboard electronic damage photo",
        "broken printer with paper jam or error light",
        "leaking toner cartridge or damaged cartridge photo",
        "damaged keyboard missing keys photo",
        "broken electronics components damaged close up"
    ]
}

# ------------------------------
# FUNCIÓN PARA ELIMINAR DUPLICADOS
# ------------------------------
def eliminar_duplicados(folder_path):
    print(f"[INFO] Eliminando duplicados en: {folder_path}")
    hashes = set()
    total = 0
    removed = 0
    for fname in os.listdir(folder_path):
        fpath = os.path.join(folder_path, fname)
        try:
            with open(fpath, "rb") as f:
                filehash = hashlib.md5(f.read()).hexdigest()
            if filehash in hashes:
                os.remove(fpath)
                removed += 1
            else:
                hashes.add(filehash)
            total += 1
        except Exception:
            pass
    print(f"   -> {removed}/{total} imágenes duplicadas eliminadas")

# ------------------------------
# FUNCIÓN PARA DESCARGAR IMÁGENES
# ------------------------------
def descargar_categoria(categoria, queries):
    dest_dir = os.path.join(BASE_DIR, categoria)
    os.makedirs(dest_dir, exist_ok=True)

    print(f"\n[INFO] Descargando imágenes para '{categoria}' en {dest_dir}")

    crawlers = [
        ("Google", GoogleImageCrawler(storage={'root_dir': dest_dir})),
        ("Bing", BingImageCrawler(storage={'root_dir': dest_dir}))
    ]

    offset = 0
    for query in queries:
        for nombre, crawler in crawlers:
            print(f"   -> {nombre}: '{query}' ({IMGS_POR_QUERY} imgs)")
            crawler.crawl(
                keyword=query,
                max_num=IMGS_POR_QUERY,
                min_size=MIN_SIZE,
                file_idx_offset=offset
            )
            offset += IMGS_POR_QUERY

# ------------------------------
# FILTRAR IMÁGENES IRRELEVANTES (versión corregida para Windows)
# ------------------------------
def filtrar_imagenes_invalidas(folder_path):
    print(f"[INFO] Filtrando imágenes irrelevantes en: {folder_path}")
    count_removed = 0
    for fname in os.listdir(folder_path):
        fpath = os.path.join(folder_path, fname)
        try:
            with Image.open(fpath) as img:  # <─ se asegura el cierre del archivo
                w, h = img.size
                # Eliminar imágenes pequeñas o sin color (grises, íconos, diagramas)
                if w < 200 or h < 200 or img.mode not in ["RGB", "RGBA"]:
                    img.close()
                    os.remove(fpath)
                    count_removed += 1
        except (UnidentifiedImageError, OSError):
            try:
                os.remove(fpath)
                count_removed += 1
            except PermissionError:
                pass
        except PermissionError:
            # Si el archivo sigue bloqueado, lo saltamos
            print(f"   [ADVERTENCIA] No se pudo eliminar (bloqueado): {fname}")
            continue
    print(f"   -> {count_removed} imágenes eliminadas por baja calidad")

# ------------------------------
# PROCESO PRINCIPAL
# ------------------------------
if __name__ == "__main__":
    print(f"Iniciando descarga de dataset optimizado en: {BASE_DIR}")

    for categoria, queries in search_queries.items():
        descargar_categoria(categoria, queries)
        filtrar_imagenes_invalidas(os.path.join(BASE_DIR, categoria))
        eliminar_duplicados(os.path.join(BASE_DIR, categoria))

    print("\n[OK] Dataset descargado, filtrado y limpio. Listo para usar en 'preparar_dataset.py'")