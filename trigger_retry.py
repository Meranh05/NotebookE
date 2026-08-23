import asyncio
import os
import sys
sys.path.insert(0, os.path.abspath('.'))
from dotenv import load_dotenv
load_dotenv()
from notebooke.database.repository import db_connection
import httpx

async def trigger_retry():
    async with db_connection() as db:
        res = await db.query("SELECT id FROM episode WHERE status = 'FAILED' LIMIT 1;")
        
        # In surreal-db python SDK, res is typically a list of dictionaries if it's the direct result.
        # But wait, earlier I found it's actually just `res[0]['id']` if it returns records!
        
        if res and len(res) > 0:
            # Handle both formats (flat vs nested result)
            if 'result' in res[0]:
                ep_id_full = res[0]['result'][0]['id']
            else:
                ep_id_full = res[0]['id']
                
            ep_id = ep_id_full.split(':')[1] if ':' in ep_id_full else ep_id_full
            print(f'Found failed episode: {ep_id}')
            
            print('Triggering retry via FastAPI...')
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f'http://localhost:5055/api/v1/podcasts/episodes/{ep_id}/retry',
                    headers={'Content-Type': 'application/json'}
                )
                print(f'API Response: {resp.status_code} - {resp.text}')
        else:
            print('No failed episodes found.')

if __name__ == "__main__":
    asyncio.run(trigger_retry())
