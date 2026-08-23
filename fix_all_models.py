import asyncio
import os
import sys
sys.path.insert(0, os.path.abspath('.'))
from dotenv import load_dotenv
load_dotenv()
from notebooke.database.repository import db_connection

async def fix_all_models_in_db():
    async with db_connection() as db:
        print("Fetching model IDs...")
        try:
            res_groq = await db.query("SELECT id FROM model WHERE name = 'llama-3.3-70b-versatile';")
            groq_id = res_groq[0]['id']
            
            res_dg = await db.query("SELECT id FROM model WHERE name = 'aura-2-asteria-en';")
            dg_id = res_dg[0]['id']
        except Exception as e:
            # Fallback if first models aren't found
            print("Failed to find llama-3.3 or aura-2, finding any groq/deepgram models...")
            res_groq = await db.query("SELECT id FROM model WHERE provider = 'groq' LIMIT 1;")
            groq_id = res_groq[0]['id'] if res_groq else None
            
            res_dg = await db.query("SELECT id FROM model WHERE provider = 'deepgram' LIMIT 1;")
            dg_id = res_dg[0]['id'] if res_dg else None
            
        if not groq_id or not dg_id:
            print("Could not find suitable Groq or Deepgram models in DB.")
            return

        print(f"Using Text Model: {groq_id}")
        print(f"Using TTS Model: {dg_id}")

        print("Applying fix across all configurations...")
        # 1. Update Global Settings
        await db.query(f"UPDATE global_settings SET models.chat = {groq_id}, models.tts = {dg_id};")
        
        # 2. Update ALL Episode Profiles
        await db.query(f"UPDATE episode_profile SET outline_llm = {groq_id}, transcript_llm = {groq_id};")
        
        # 3. Update ALL Speaker Profiles
        await db.query(f"UPDATE speaker_profile SET voice_model = {dg_id};")
        
        # 4. Update ALL Individual Speakers
        await db.query(f"UPDATE speaker SET voice_model = {dg_id};")
        
        # 5. Update Notebook models if any
        await db.query(f"UPDATE notebook SET model = {groq_id};")

        print("Database models successfully updated to bypass Google limits!")

if __name__ == "__main__":
    asyncio.run(fix_all_models_in_db())
