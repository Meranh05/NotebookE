import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        # Get episodes
        resp = await client.get('http://localhost:5055/api/podcasts/episodes')
        if resp.status_code == 200:
            episodes = resp.json()
            print(f'Found {len(episodes)} episodes')
            for ep in episodes:
                if ep.get('status') == 'FAILED' or ep.get('error_message') or ep.get('status') == 'NOT_FOUND':
                    print(f"Found failed episode: {ep['id']}")
                    retry_resp = await client.post(f"http://localhost:5055/api/podcasts/episodes/{ep['id']}/retry")
                    print(f'Retry triggered: {retry_resp.status_code} - {retry_resp.text}')
                    return
            print('No failed episodes found in API response')
        else:
            print(f'Error fetching episodes: {resp.status_code}')

if __name__ == "__main__":
    asyncio.run(test())
