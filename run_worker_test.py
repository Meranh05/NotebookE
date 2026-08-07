import os
import subprocess

env = os.environ.copy()
env['PYTHONUTF8'] = '1'

with open("worker_test.log", "w", encoding="utf-8") as f:
    process = subprocess.Popen(
        ["uv", "run", "--env-file", ".env", "surreal-commands-worker", "--import-modules", "commands", "--max-tasks", "5", "start"],
        env=env,
        stdout=f,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8"
    )

import time

time.sleep(5)
process.terminate()
