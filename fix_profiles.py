import asyncio
import os
from dotenv import load_dotenv
load_dotenv()
from notebooke.database.repository import db_connection

async def fix_profiles():
    async with db_connection() as db:
        # We know models are records like model:id. We can find the model with name gemini-3.5-flash.
        res = await db.query('UPDATE episode_profile SET outline_llm = (SELECT VALUE id FROM ONLY model WHERE name = "gemini-3.5-flash" LIMIT 1) WHERE outline_llm.name = "gemini-3.6-flash" OR outline_llm.name = "gemini-2.5-flash";')
        res2 = await db.query('UPDATE episode_profile SET transcript_llm = (SELECT VALUE id FROM ONLY model WHERE name = "gemini-3.5-flash" LIMIT 1) WHERE transcript_llm.name = "gemini-3.6-flash" OR transcript_llm.name = "gemini-2.5-flash";')
        
        # Update speaker profiles
        res3 = await db.query('UPDATE speaker_profile SET voice_model = (SELECT VALUE id FROM ONLY model WHERE name = "gemini-3.5-flash" LIMIT 1) WHERE voice_model.name = "gemini-3.6-flash" OR voice_model.name = "gemini-2.5-flash";')
        
        print("Updated episode profiles (outline):", res)
        print("Updated episode profiles (transcript):", res2)
        print("Updated speaker profiles:", res3)

if __name__ == "__main__":
    asyncio.run(fix_profiles())
