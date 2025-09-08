from icrawler.builtin import BingImageCrawler
import os

# Definir categorías y productos
search_queries = {
    "nuevo": {
        "monitor": "brand new computer monitor",
        "torre": "new desktop pc tower",
        "smartphone": "new smartphone in box",
        "impresora": "new printer",
        "toner": "new toner cartridge"
    },
    "usado": {
        "monitor": "used computer monitor",
        "torre": "second hand desktop pc",
        "smartphone": "used smartphone",
        "impresora": "second hand printer",
        "toner": "used toner cartridge"
    },
    "mal_estado": {
        "monitor": "broken computer monitor",
        "torre": "damaged desktop pc",
        "smartphone": "broken smartphone",
        "impresora": "damaged printer",
        "toner": "broken toner cartridge"
    }
}

# Cantidad de imágenes por producto
imgs_por_producto = 20

# Crear dataset con subcarpetas por categoría y producto
for categoria, productos in search_queries.items():
    carpeta_categoria = f'dataset_inicial/{categoria}'
    os.makedirs(carpeta_categoria, exist_ok=True)
    
    for producto, query in productos.items():
        carpeta_producto = os.path.join(carpeta_categoria, producto)
        os.makedirs(carpeta_producto, exist_ok=True)
        
        crawler = BingImageCrawler(storage={'root_dir': carpeta_producto})
        crawler.crawl(
            keyword=query,
            max_num=imgs_por_producto,
            min_size=(200, 200)
        )

print("✅ Dataset descargado en dataset/train/ con subcarpetas por producto dentro de cada categoría")