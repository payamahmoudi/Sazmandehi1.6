# سرور سامانه ساماندهی نیروی انسانی

## پیش‌نیازها
- Python 3.9+
- pip

## نصب و راه‌اندازی

```bash
# 1. وارد پوشه سرور شوید
cd server

# 2. نصب وابستگی‌ها
pip install -r requirements.txt

# 3. اجرای سرور
python main.py
```

سرور روی `http://localhost:8000` اجرا می‌شود.

## تنظیمات

فایل `config.py` را ویرایش کنید:

| تنظیم | توضیح |
|---|---|
| `SECRET_KEY` | کلید رمزنگاری JWT - **حتماً تغییر دهید!** |
| `ADMIN_USERNAME` | نام کاربری مدیر اصلی |
| `ADMIN_PASSWORD` | رمز عبور اولیه مدیر |
| `FRONTEND_ORIGINS` | آدرس فرانت‌اند (برای CORS) |

## API Endpoints

### احراز هویت
- `POST /api/auth/login` - ورود (username + password → JWT token)
- `GET /api/auth/me` - اطلاعات کاربر جاری

### مدیریت کاربران (فقط ادمین)
- `GET /api/users` - لیست کاربران
- `POST /api/users` - ایجاد کاربر
- `PUT /api/users/{id}` - ویرایش کاربر
- `DELETE /api/users/{id}` - حذف کاربر

### داده‌ها
- `GET /api/workspace` - دریافت داده‌های کاربر
- `POST /api/workspace` - ذخیره داده‌ها

### تاریخچه
- `GET /api/history` - دریافت تاریخچه
- `POST /api/history` - ثبت تاریخچه

## استقرار روی سرور

### Railway (رایگان)
1. به railway.app بروید
2. پروژه جدید بسازید
3. پوشه `server` را آپلود کنید
4. متغیر محیطی `SECRET_KEY` را تنظیم کنید

### VPS / سرور اختصاصی
```bash
# با Gunicorn
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000

# با systemd service
sudo nano /etc/systemd/system/saman-edu.service
```

## امنیت
- رمزهای عبور با bcrypt هش می‌شوند
- احراز هویت با JWT
- CORS محدود به آدرس فرانت‌اند
- Swagger UI غیرفعال

## طراح
پایا محمودی
