import asyncio
import os
import sys
sys.path.insert(0, os.path.abspath('.'))
from dotenv import load_dotenv
load_dotenv()
from notebooke.database.repository import db_connection

async def fix_and_test():
    async with db_connection() as db:
        # Get Groq model ID
        res = await db.query("SELECT id FROM model WHERE name = 'llama-3.3-70b-versatile';")
        groq_id = res[0]['id']
        
        # Get Deepgram model ID
        res2 = await db.query("SELECT id FROM model WHERE name = 'aura-2-asteria-en';")
        dg_id = res2[0]['id']
        
        # Update Profiles explicitly
        await db.query(f"UPDATE episode_profile SET outline_llm = {groq_id}, transcript_llm = {groq_id} WHERE name = 'business_analysis';")
        await db.query(f"UPDATE speaker_profile SET voice_model = {dg_id} WHERE name = 'business_panel';")
        await db.query(f"UPDATE global_settings SET models.chat = {groq_id}, models.tts = {dg_id};")
        
        # The key fix: update all speakers to Deepgram to avoid the Gemini TTS issue
        await db.query(f"UPDATE speaker SET voice_model = {dg_id};")
        
        print("Models explicitly updated!")

if __name__ == "__main__":
    asyncio.run(fix_and_test())
