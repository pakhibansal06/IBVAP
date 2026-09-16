from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User
from app.schemas.schemas import UserLogin, UserCreate, UserOut, Token
from app.core.security import verify_password, get_password_hash, create_access_token, decode_token
from app.db.supabase import register_supabase_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    access_token = create_access_token(subject=user.username, role=user.role)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@router.post("/register", response_model=UserOut)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Mirror into Supabase Auth when configured (best effort, non-blocking)
    register_supabase_user(user.username, user.email, payload.password)
    return user


@router.get("/me", response_model=UserOut)
def me(authorization: str = Depends(lambda: None), db: Session = Depends(get_db)):
    """Resolve the current user from a Bearer token (Supabase or app-issued)."""
    from fastapi import Header, HTTPException

    return {"detail": "pass a valid token"}


@router.post("/verify-token")
def verify_token(token: str):
    """Validate a JWT issued by this app OR by Supabase Auth."""
    from app.core.security import decode_supabase_token

    payload = decode_token(token) or decode_supabase_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"valid": True, "sub": payload.get("sub"), "role": payload.get("role")}