import asyncio
from notebooke.database.manager import get_db

async def fix_db():
    db = await get_db()
    # Apply migration logic directly to force update
    await db.query('UPDATE model SET name = "gemini-3.5-flash" WHERE name = "gemini-2.5-flash";')
    await db.query('UPDATE model SET name = "gemini-3.5-pro" WHERE name = "gemini-2.5-pro";')
    print("Database models successfully updated to 3.5 variants.")

if __name__ == "__main__":
    asyncio.run(fix_db())
