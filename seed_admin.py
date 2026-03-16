"""
Creates the admin user account.
Run inside the container: docker compose exec api python seed_admin.py
"""
import sys
sys.path.insert(0, '/app')

from api.database import SessionLocal, create_tables
from api.utils.security import get_password_hash
from api.database import User

ADMIN_EMAIL = "admin@cliniq.app"
ADMIN_PASSWORD = "OmSaiRam123!"
ADMIN_NAME = "Admin"


def seed():
    create_tables()
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if existing:
            existing.is_admin = True
            existing.hashed_password = get_password_hash(ADMIN_PASSWORD)
            db.commit()
            print(f"✓ Admin account updated: {ADMIN_EMAIL}")
        else:
            admin = User(
                email=ADMIN_EMAIL,
                full_name=ADMIN_NAME,
                hashed_password=get_password_hash(ADMIN_PASSWORD),
                is_active=True,
                is_admin=True,
            )
            db.add(admin)
            db.commit()
            print(f"✓ Admin account created: {ADMIN_EMAIL}")
        print(f"  Password: {ADMIN_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
