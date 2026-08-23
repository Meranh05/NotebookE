import asyncio
import os
import sys
sys.path.insert(0, os.path.abspath('.'))
from dotenv import load_dotenv
load_dotenv()
from notebooke.database.repository import db_connection

async def list_eps():
    async with db_connection() as db:
        res = await db.query("SELECT id, status FROM episode;")
        print(res)

if __name__ == "__main__":
    asyncio.run(list_eps())
