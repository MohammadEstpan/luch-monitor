import subprocess
from pathlib import Path

VERSION = "2.4.1"

def _git_build() -> str:
    try:
        result = subprocess.run(
            ["git", "rev-list", "--count", "HEAD"],
            capture_output=True, text=True,
            cwd=str(Path(__file__).parent.parent),
            timeout=3,
        )
        if result.returncode == 0 and result.stdout.strip().isdigit():
            base = 8412
            return str(base + int(result.stdout.strip()))
    except Exception:
        pass
    return "8412"

BUILD = _git_build()
