import asyncio

from fastapi.testclient import TestClient

from api.main import app
from notebooke.domain.notebook import Source, SourceChatSession

client = TestClient(app)

def run_test():
    source = Source(id="source:test_fastapi", url="http://test.com", title="Test")
    session = SourceChatSession(id="source_chat_session:test_fastapi", source_id="test_fastapi", title="Test")
    
    async def save_mocks():
        # Setup SurrealDB connection for TestClient if not already setup
        from surreal_commands.core.database import db
        await db.connect()
        await source.save()
        await session.save()
        
    asyncio.run(save_mocks())
    
    resp = client.post(
        "/sources/test_fastapi/chat/sessions/test_fastapi/messages",
        json={"message": "hello"}
    )
    for chunk in resp.iter_content(chunk_size=None):
        print(chunk.decode('utf-8'))

if __name__ == "__main__":
    run_test()
