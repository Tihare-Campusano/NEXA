# -*- coding: utf-8 -*-

"""

descargar_dataset_simple_plus.py

----------------------------------------------------

Versión extendida sin filtrado ni validación.

Descarga masiva de imágenes desde Google y Bing para las categorías:

    - nuevo

    - usado

    - mal_estado



Objetivo:

  - Ampliar la variedad de resultados

  - Generar un dataset grande (~50K+ imágenes)

  - Sin filtrado ni deduplicado, máxima cobertura

"""



import os

import time

import random

from icrawler.builtin import GoogleImageCrawler, BingImageCrawler

from icrawler.storage import FileSystem



# -------------------------------------------------------

# CONFIGURACIÓN

# -------------------------------------------------------

BASE_DIR = "inventario-app/modelo_ia/dataset_inicial"

IMGS_POR_QUERY = 1000

CATEGORIAS = ["nuevo", "usado", "mal_estado"]

PAUSA_ENTRE_CRAWLERS = (2.5, 5.5)



# -------------------------------------------------------

# QUERIES VARIADAS (ampliadas y multilenguaje)

# -------------------------------------------------------

search_queries = {

    "nuevo": [

        "brand new computer monitor realistic photo",

        "unboxing new laptop photo",

        "new smartphone sealed box",

        "new electronics setup desk photo",

        "brand new gaming pc photo",

        "new computer accessories on shelf",

        "new keyboard still in plastic",

        "new electronics store display",

        "brand new tech products photo",

        "new electronics unboxing realistic",

        "new desktop computer photo",

        "brand new tablet close up",

        "new keyboard and mouse set photo",

        "new pc build components photo",

        "new electronic devices packaging photo",

        "computadora nueva en caja foto",

        "monitor nuevo en tienda",

        "laptop nueva sin abrir foto real",

        "celular nuevo caja sellada",

        "accesorios de pc nuevos foto",

        "productos electrónicos nuevos vitrina",

        "teclado nuevo aún en plástico",

        "nuevo setup gamer foto real",

        "computadora nueva en escritorio",

        "electrónica nueva lista para uso",

    ],



    "usado": [

        "used computer monitor on desk photo",

        "old laptop on messy table",

        "used keyboard with worn keys",

        "second hand computer setup photo",

        "used gaming peripherals dusty photo",

        "old monitor with scratches",

        "used mouse with wear marks",

        "used desktop setup at home office",

        "second hand computer accessories",

        "old computer equipment for sale",

        "used electronics warehouse photo",

        "used tech desk setup realistic photo",

        "old keyboard yellowed keys",

        "used laptop slightly damaged photo",

        "computadora usada en escritorio foto",

        "laptop vieja sobre mesa foto real",

        "teclado usado con teclas sucias",

        "setup gamer usado foto real",

        "monitor usado en oficina",

        "mouse usado con rayas",

        "componentes de pc usados en venta",

        "equipo electrónico usado en casa",

        "computadora vieja en taller",

        "pc usado funcionando",

        "teclado y ratón usados foto",

        "monitor antiguo usado foto real",

        "portátil de segunda mano foto",

        "accesorios electrónicos usados mesa",

    ],



    "mal_estado": [

        "broken computer monitor cracked screen",

        "damaged laptop missing keys",

        "broken smartphone shattered glass",

        "burnt pc components photo",

        "broken keyboard dirty missing keys",

        "broken electronics repair table",

        "cracked computer display",

        "damaged motherboard burnt components",

        "destroyed desktop tower dented dusty",

        "broken monitor on floor",

        "burnt graphics card photo",

        "damaged hard drive photo",

        "broken mouse with cable cut",

        "old dusty computer parts damaged",

        "electronics with corrosion photo",

        "monitor roto pantalla quebrada",

        "laptop dañada sin teclas foto",

        "celular con pantalla rota foto real",

        "componentes de pc quemados foto",

        "teclado roto sucio sin teclas",

        "electrónica dañada en taller reparación",

        "computadora con carcasa rota",

        "tarjeta madre dañada quemada",

        "torre de pc golpeada oxidada",

        "pantalla rota monitor foto real",

        "teclado destruido lleno de polvo",

        "pc vieja quemada foto",

        "laptop rota en mal estado",

        "monitor dañado con rayas foto",

        "computadora averiada sucia foto",

    ]

}



# -------------------------------------------------------

# DESCARGA POR CATEGORÍA

# -------------------------------------------------------

def descargar_categoria(categoria, queries):

    dest_dir = os.path.join(BASE_DIR, categoria)

    os.makedirs(dest_dir, exist_ok=True)



    crawlers = [

        ("Google", GoogleImageCrawler(storage=FileSystem(dest_dir))),

        ("Bing", BingImageCrawler(storage=FileSystem(dest_dir)))

    ]



    print(f"\n[INFO] Descargando categoría '{categoria}' -> {dest_dir}")



    for query in queries:

        for nombre, crawler in crawlers:
            print(f"     -> {nombre}: {query}")
            try:

                crawler.crawl(

                    keyword=query + " -stock -illustration -render -vector -icon",

                    max_num=IMGS_POR_QUERY,

                    overwrite=False

                )

                pausa = random.uniform(*PAUSA_ENTRE_CRAWLERS)
                time.sleep(pausa)

            except Exception as e:

                print(f"       Advertencia: {nombre} falló: {e}")

                time.sleep(3)



# -------------------------------------------------------

# EJECUCIÓN PRINCIPAL

# -------------------------------------------------------

if __name__ == "__main__":
    start = time.time()
    print(f"\n[INICIO] Descargando dataset SIMPLE+ (Google + Bing)\nCategorías: {CATEGORIAS}\n")



    for cat, queries in search_queries.items():
        descargar_categoria(cat, queries)



    elapsed = int(time.time() - start)
    mins, secs = divmod(elapsed, 60)
    print(f"\nDataset completado en {mins} min {secs} s.")
    print(f"Imágenes guardadas en: {BASE_DIR}")
    print("Total estimado: más de 50.000 imágenes sin filtrado.")
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
