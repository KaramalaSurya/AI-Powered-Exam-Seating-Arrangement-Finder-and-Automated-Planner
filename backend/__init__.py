# backend package initialization
import sys
from pathlib import Path

# Ensure the root folder (parent of backend) is in sys.path so 'backend.xxx' imports resolve
root_dir = str(Path(__file__).resolve().parent.parent)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

# Ensure backend folder itself is in sys.path
backend_dir = str(Path(__file__).resolve().parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
