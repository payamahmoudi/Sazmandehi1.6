import os

# ━━━━━━━━ تنظیمات اصلی سرور ━━━━━━━━

# کلید رمزنگاری JWT - حتماً تغییر دهید!
SECRET_KEY = os.getenv("SECRET_KEY", "PayaMahmoudi-Saman-Edu-1406-SuperSecretKey-ChangeThis!")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 ساعت

# پایگاه داده
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./saman_edu.db")

# مدیر اصلی - رمز اولیه (بعد از اولین ورود تغییر دهید)
ADMIN_USERNAME = "paya"
ADMIN_PASSWORD = "Mahmoudi80"
ADMIN_FULLNAME = "پایا محمودی"

# CORS - آدرس فرانت‌اند
FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://localhost:3000,https://your-domain.com").split(",")

# حداکثر حجم آپلود (MB)
MAX_UPLOAD_SIZE = 10
