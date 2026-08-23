import asyncio
import os
import sys
sys.path.insert(0, os.path.abspath('.'))
from dotenv import load_dotenv
load_dotenv()
from notebooke.database.repository import db_connection

async def get_commands():
    async with db_connection() as db:
        res = await db.query("SELECT id, command_name, status, created_at FROM command WHERE command_name = 'generate_podcast' ORDER BY created_at DESC LIMIT 5;")
        print(res)

if __name__ == "__main__":
    asyncio.run(get_commands())
