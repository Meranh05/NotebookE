import sys
import os
sys.path.insert(0, os.path.abspath('.'))

import asyncio
from dotenv import load_dotenv
load_dotenv()

from commands.podcast_commands import generate_podcast_command, PodcastGenerationInput
from notebooke.database.repository import db_connection

async def test():
    async with db_connection() as db:
        input_data = PodcastGenerationInput(
            content="This is a final test podcast generation for NotebookE using Groq and Deepgram.",
            episode_name="Groq Test Episode",
            episode_profile="business_analysis",
            speaker_profile="business_panel"
        )
        print("Starting podcast generation...")
        try:
            res = await generate_podcast_command(input_data)
            print("Podcast generation SUCCESSFUL!")
            print(res)
        except Exception as e:
            print(f"Podcast generation failed: {e}")

if __name__ == "__main__":
    asyncio.run(test())
