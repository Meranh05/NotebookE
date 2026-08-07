import json
import urllib.parse
import urllib.request

req = urllib.request.Request(
    'http://localhost:8000/sql',
    data=b"SELECT * FROM podcast_episode; SELECT id, status, error_message FROM command ORDER BY created_at DESC LIMIT 5;",
    headers={
        'Accept': 'application/json',
        'NS': 'notebooke',
        'DB': 'notebooke',
        'Authorization': 'Basic cm9vdDpyb290'
    }
)

try:
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode())
        print("Episodes:")
        if result[0]['result']:
            for ep in result[0]['result']:
                print(f"  {ep.get('name')} (command: {ep.get('command')})")
        else:
            print("  None")
        print("Commands:")
        if result[1]['result']:
            for cmd in result[1]['result']:
                print(f"  {cmd.get('id')} - {cmd.get('status')} - {cmd.get('error_message')}")
        else:
            print("  None")
except Exception as e:
    print(f"Error: {e}")
