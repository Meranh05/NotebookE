import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath('.'))
from dotenv import load_dotenv

load_dotenv()
from notebooke.database.repository import db_connection


async def check():
    async with db_connection() as db:
        res = await db.query("SELECT outline_llm.name, transcript_llm.name FROM episode_profile WHERE name = 'business_analysis';")
        print("Profile models:", res)
        
        # Also check model table
        res2 = await db.query("SELECT id, name, provider FROM model;")
        for m in res2[0]['result']:
            if m['name'] == 'gemini-2.0-flash-lite':
                print('Found gemini-2.0-flash-lite in DB!')
            if m['name'] == 'gemini-2.5-flash-image':
                print('Found gemini-2.5-flash-image in DB!')

if __name__ == "__main__":
    asyncio.run(check())
