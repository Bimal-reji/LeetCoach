# API

- **[openapi.json](./openapi.json)** — machine-readable OpenAPI 3.1 spec
  (30 endpoints), generated directly from the running FastAPI app.
- **[docs/API.md](../docs/API.md)** — human-friendly endpoint reference.

Regenerate after changing routes:

```bash
cd backend
python -c "
import os, json
os.environ['DATABASE_URL']='sqlite+aiosqlite:///./data/openapi.db'
from fastapi.testclient import TestClient
from app.main import app
with TestClient(app) as c:
    (__import__('pathlib').Path('../api/openapi.json').write_text(json.dumps(c.get('/openapi.json').json(), indent=2)))
"
```
