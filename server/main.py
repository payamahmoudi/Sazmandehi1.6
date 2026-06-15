import json
import uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional, List

from config import FRONTEND_ORIGINS, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_FULLNAME
from database import database, users, workspaces, history
from auth import hash_password, verify_password, create_access_token, get_current_user

# ━━━━━━━━ App ━━━━━━━━

app = FastAPI(
    title="سامانه ساماندهی نیروی انسانی",
    version="2.0.0",
    docs_url=None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ━━━━━━━━ Startup ━━━━━━━━

@app.on_event("startup")
async def startup():
    await database.connect()
    admin = await database.fetch_one(users.select().where(users.c.username == ADMIN_USERNAME.lower()))
    if not admin:
        await database.execute(users.insert().values(
            id="admin-master-paya",
            username=ADMIN_USERNAME.lower(),
            password_hash=hash_password(ADMIN_PASSWORD),
            full_name=ADMIN_FULLNAME,
            role="admin",
            panel_title="پنل مدیریت کل سامانه",
            is_active=True,
            organization_json=json.dumps({
                "ministry": "وزارت آموزش و پرورش",
                "province": "استان چهارمحال و بختیاری",
                "office": "اداره آموزش و پرورش شهرستان سامان"
            }, ensure_ascii=False),
            created_at=datetime.utcnow().isoformat(),
        ))


@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


# ━━━━━━━━ Models ━━━━━━━━

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "user"
    panel_title: str = "پنل ساماندهی"
    is_active: bool = True
    expiration_days: Optional[int] = None
    allowed_tabs: Optional[List[str]] = None
    province: Optional[str] = None
    office: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    panel_title: Optional[str] = None
    is_active: Optional[bool] = None
    expiration_days: Optional[int] = None
    allowed_tabs: Optional[List[str]] = None
    province: Optional[str] = None
    office: Optional[str] = None

class WorkspaceData(BaseModel):
    data: dict


# ━━━━━━━━ Helper: format user response ━━━━━━━━

def format_user(u) -> dict:
    org = json.loads(u["organization_json"]) if u["organization_json"] else None
    tabs = json.loads(u["allowed_tabs"]) if u["allowed_tabs"] else None
    return {
        "id": u["id"], "username": u["username"], "fullName": u["full_name"],
        "role": u["role"], "panelTitle": u["panel_title"], "isActive": u["is_active"],
        "allowedTabs": tabs, "organization": org,
        "expirationDays": u["expiration_days"], "lastLogin": u["last_login"],
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AUTH ROUTES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.post("/api/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await database.fetch_one(
        users.select().where(users.c.username == form_data.username.strip().lower())
    )
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="نام کاربری یا رمز عبور اشتباه است.")
    if not user["is_active"]:
        raise HTTPException(status_code=403, detail="حساب کاربری غیرفعال است.")
    if user["expiration_days"]:
        created = datetime.fromisoformat(user["created_at"])
        if (datetime.utcnow() - created).days > user["expiration_days"]:
            raise HTTPException(status_code=403, detail="حساب شما منقضی شده است.")

    await database.execute(
        users.update().where(users.c.id == user["id"]).values(last_login=datetime.utcnow().isoformat())
    )
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return {"access_token": token, "token_type": "bearer", "user": format_user(user)}


@app.get("/api/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    """Returns current user profile. Identity comes from JWT only."""
    user = await database.fetch_one(users.select().where(users.c.id == current_user["user_id"]))
    if not user:
        raise HTTPException(status_code=404, detail="کاربر یافت نشد.")
    return format_user(user)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# USER MANAGEMENT — Admin only, backend enforced
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def require_admin(current_user):
    """Authorization: only admin role can manage users."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="فقط مدیر سامانه دسترسی دارد.")


@app.get("/api/users")
async def list_users(current_user=Depends(get_current_user)):
    require_admin(current_user)
    rows = await database.fetch_all(users.select())
    return [format_user(u) for u in rows]


@app.post("/api/users")
async def create_user(user_data: UserCreate, current_user=Depends(get_current_user)):
    require_admin(current_user)
    existing = await database.fetch_one(
        users.select().where(users.c.username == user_data.username.strip().lower())
    )
    if existing:
        raise HTTPException(status_code=400, detail="این نام کاربری قبلاً ثبت شده است.")

    user_id = f"user-{uuid.uuid4().hex[:12]}"
    org = {"ministry": "وزارت آموزش و پرورش",
           "province": f"استان {user_data.province or 'چهارمحال و بختیاری'}",
           "office": f"اداره آموزش و پرورش {user_data.office or 'شهرستان سامان'}"}

    await database.execute(users.insert().values(
        id=user_id,
        username=user_data.username.strip().lower(),
        password_hash=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        panel_title=user_data.panel_title,
        is_active=user_data.is_active,
        expiration_days=user_data.expiration_days,
        allowed_tabs=json.dumps(user_data.allowed_tabs, ensure_ascii=False) if user_data.allowed_tabs else None,
        organization_json=json.dumps(org, ensure_ascii=False),
        created_at=datetime.utcnow().isoformat(),
    ))
    return {"ok": True, "message": "کاربر ایجاد شد.", "id": user_id}


@app.put("/api/users/{user_id}")
async def update_user(user_id: str, updates: UserUpdate, current_user=Depends(get_current_user)):
    require_admin(current_user)
    values = {}
    if updates.full_name is not None: values["full_name"] = updates.full_name
    if updates.password is not None: values["password_hash"] = hash_password(updates.password)
    if updates.role is not None: values["role"] = updates.role
    if updates.panel_title is not None: values["panel_title"] = updates.panel_title
    if updates.is_active is not None: values["is_active"] = updates.is_active
    if updates.expiration_days is not None: values["expiration_days"] = updates.expiration_days
    if updates.allowed_tabs is not None:
        values["allowed_tabs"] = json.dumps(updates.allowed_tabs, ensure_ascii=False)
    if values:
        await database.execute(users.update().where(users.c.id == user_id).values(**values))
    return {"ok": True}


@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, current_user=Depends(get_current_user)):
    require_admin(current_user)
    if user_id == "admin-master-paya":
        raise HTTPException(status_code=400, detail="مدیر اصلی قابل حذف نیست.")
    await database.execute(users.delete().where(users.c.id == user_id))
    await database.execute(workspaces.delete().where(workspaces.c.user_id == user_id))
    await database.execute(history.delete().where(history.c.user_id == user_id))
    return {"ok": True, "message": "کاربر و تمام داده‌هایش حذف شد."}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WORKSPACE — owner_id enforced from JWT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/workspace")
async def get_workspace(current_user=Depends(get_current_user)):
    """
    Authorization:
    - Admin: can see all (but defaults to own)
    - User: only own workspace (user_id == JWT user_id)
    """
    user_id = current_user["user_id"]
    row = await database.fetch_one(
        workspaces.select().where(workspaces.c.user_id == user_id)
    )
    if not row:
        return {"data": None}
    return {"data": json.loads(row["data_json"])}


@app.post("/api/workspace")
async def save_workspace(body: WorkspaceData, current_user=Depends(get_current_user)):
    """
    Authorization: user_id always comes from JWT, never from frontend.
    Frontend cannot choose which user's workspace to write to.
    """
    user_id = current_user["user_id"]  # NEVER trust frontend
    data_json = json.dumps(body.data, ensure_ascii=False)

    existing = await database.fetch_one(
        workspaces.select().where(workspaces.c.user_id == user_id)
    )
    if existing:
        await database.execute(
            workspaces.update().where(workspaces.c.user_id == user_id)
            .values(data_json=data_json, updated_at=datetime.utcnow().isoformat())
        )
    else:
        await database.execute(workspaces.insert().values(
            user_id=user_id,
            data_json=data_json,
            updated_at=datetime.utcnow().isoformat(),
        ))
    return {"ok": True}


# Admin: view any user's workspace
@app.get("/api/workspace/{target_user_id}")
async def get_workspace_by_user(target_user_id: str, current_user=Depends(get_current_user)):
    """Admin only: view another user's workspace."""
    require_admin(current_user)
    row = await database.fetch_one(
        workspaces.select().where(workspaces.c.user_id == target_user_id)
    )
    if not row:
        return {"data": None}
    return {"data": json.loads(row["data_json"])}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HISTORY — user_id enforced from JWT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@app.get("/api/history")
async def get_history(current_user=Depends(get_current_user)):
    """
    Authorization:
    - Admin: all history
    - User: only own history (user_id == JWT user_id)
    """
    if current_user["role"] == "admin":
        rows = await database.fetch_all(
            history.select().order_by(history.c.id.desc()).limit(100)
        )
    else:
        rows = await database.fetch_all(
            history.select()
            .where(history.c.user_id == current_user["user_id"])
            .order_by(history.c.id.desc()).limit(50)
        )
    return [{"action": r["action"], "detail": r["detail"], "timestamp": r["timestamp"]} for r in rows]


@app.post("/api/history")
async def add_history(body: dict, current_user=Depends(get_current_user)):
    """user_id always from JWT, never from frontend input."""
    await database.execute(history.insert().values(
        user_id=current_user["user_id"],  # NEVER trust frontend
        action=body.get("action", ""),
        detail=body.get("detail", ""),
        timestamp=datetime.utcnow().isoformat(),
    ))
    return {"ok": True}


# ━━━━━━━━ Health Check ━━━━━━━━

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
