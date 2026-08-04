# Database

LeetCoach uses **SQLAlchemy 2.0 (async)** against SQLite locally or
PostgreSQL (Supabase) in production. Alembic manages schema migrations.

```
database/
├── alembic.ini          # Alembic config (points at backend/app/db)
├── env.py               # async migration environment
├── versions/            # generated migration scripts
└── README.md
```

## Migration workflow

```bash
cd backend

# Generate a migration after model changes
alembic revision --autogenerate -m "describe change"

# Apply migrations
alembic upgrade head

# Roll back one step
alembic downgrade -1
```

The backend also auto-creates tables on startup (`init_db`) for zero-setup
local development, so migrations are only required when sharing schema
changes across environments.
