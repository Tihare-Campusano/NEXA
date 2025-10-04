from fastapi import FastAPI
import asyncpg
import os

app = FastAPI()

DATABASE_URL = os.getenv("postgresql://postgres:[YOUR-PASSWORD]@db.apbkobhfnmcqqzqeeqss.supabase.co:5432/postgres") 

@app.on_event("startup")
async def startup():
    # Crear pool de conexión
    app.state.db = await asyncpg.create_pool(DATABASE_URL)

@app.on_event("shutdown")
async def shutdown():
    await app.state.db.close()

@app.get("/analytics/top_products")
async def top_products(limit: int = 5):
    """
    Devuelve los N productos con mayor stock.
    """
    query = """
    SELECT name, stock
    FROM products
    ORDER BY stock DESC
    LIMIT $1;
    """
    async with app.state.db.acquire() as conn:
        rows = await conn.fetch(query, limit)

    return [{"name": r["name"], "stock": r["stock"]} for r in rows]
