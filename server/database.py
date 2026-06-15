import databases
import sqlalchemy
from config import DATABASE_URL

# ━━━━━━━━ Database Connection ━━━━━━━━

database = databases.Database(DATABASE_URL)
metadata = sqlalchemy.MetaData()

# ━━━━━━━━ Users Table ━━━━━━━━
users = sqlalchemy.Table(
    "users", metadata,
    sqlalchemy.Column("id", sqlalchemy.String, primary_key=True),
    sqlalchemy.Column("username", sqlalchemy.String, unique=True, index=True),
    sqlalchemy.Column("password_hash", sqlalchemy.String),
    sqlalchemy.Column("full_name", sqlalchemy.String),
    sqlalchemy.Column("role", sqlalchemy.String, default="user"),
    sqlalchemy.Column("panel_title", sqlalchemy.String, default="پنل ساماندهی"),
    sqlalchemy.Column("is_active", sqlalchemy.Boolean, default=True),
    sqlalchemy.Column("expiration_days", sqlalchemy.Integer, nullable=True),
    sqlalchemy.Column("allowed_tabs", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("province", sqlalchemy.String, nullable=True),
    sqlalchemy.Column("office", sqlalchemy.String, nullable=True),
    sqlalchemy.Column("organization_json", sqlalchemy.Text, nullable=True),
    sqlalchemy.Column("organization_id", sqlalchemy.String, nullable=True),  # Future multi-tenant
    sqlalchemy.Column("created_at", sqlalchemy.String),
    sqlalchemy.Column("last_login", sqlalchemy.String, nullable=True),
)

# ━━━━━━━━ Workspaces Table (owner_id enforced) ━━━━━━━━
workspaces = sqlalchemy.Table(
    "workspaces", metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True, autoincrement=True),
    sqlalchemy.Column("user_id", sqlalchemy.String, index=True),        # owner
    sqlalchemy.Column("organization_id", sqlalchemy.String, nullable=True),  # Future
    sqlalchemy.Column("data_json", sqlalchemy.Text),
    sqlalchemy.Column("updated_at", sqlalchemy.String),
)

# ━━━━━━━━ History Table (user_id enforced) ━━━━━━━━
history = sqlalchemy.Table(
    "history", metadata,
    sqlalchemy.Column("id", sqlalchemy.Integer, primary_key=True, autoincrement=True),
    sqlalchemy.Column("user_id", sqlalchemy.String, index=True),        # owner
    sqlalchemy.Column("organization_id", sqlalchemy.String, nullable=True),  # Future
    sqlalchemy.Column("action", sqlalchemy.String),
    sqlalchemy.Column("detail", sqlalchemy.String),
    sqlalchemy.Column("timestamp", sqlalchemy.String),
)

# Create tables
engine = sqlalchemy.create_engine(DATABASE_URL.replace("sqlite:///", "sqlite:///"))
metadata.create_all(engine)
