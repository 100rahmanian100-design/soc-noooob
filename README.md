# Ermanian SOC Academy 3.0

معماری بومی Vercel — فرانت استاتیک React + توابع Serverless + ذخیره‌سازی Blob:

**فرانت = React 19 + Vite (استاتیک، خروجی `dist`) | بک‌اند = دو تابع Serverless TypeScript خود Vercel | دیتابیس = Vercel Blob (ذخیره فایل JSON)**

## ساختار پروژه

```
├── index.html              # ورودی Vite (SPA فارسی RTL)
├── src/                    # فرانت React + TypeScript + Tailwind
│   ├── App.tsx             # مسیریابی hash + هدر + نشست
│   ├── api.ts              # کلاینت API (POST /api/auth و /api/data)
│   └── pages/              # AuthPage · GuidePage (راهنمای شروع به کار) · AdminPage
├── api/
│   ├── auth.ts             # Serverless: ورود/ثبت‌نام/تغییر رمز
│   ├── data.ts             # Serverless: داده کاربر/کامنت/مدیریت حساب
│   └── _lib/
│       ├── core.ts         # هش scrypt، کوکی امضاشده HMAC، لایه ذخیره‌سازی
│       └── handlers.ts     # منطق مشترک (مستقل از فریم‌ورک)
├── server.ts               # Express — فقط برای اجرای محلی
├── vercel.json             # buildCommand: vite build · outputDirectory: dist
└── legacy/                 # نسخه ۲ (تک‌فایلی) — مرجع قدیمی
```

## نقش‌ها و دسترسی‌ها

| نقش | نحوه ایجاد | دسترسی |
| --- | --- | --- |
| **سوپر ادمین** | نخستین ثبت‌نام عمومی با کد دعوتی (`INVITE_CODE`، پیش‌فرض `ermanian`) | همه‌چیز: ساخت ادمین و کاربر، دیدن و پاسخ همه گفت‌وگوها، مدیریت همه حساب‌ها |
| **ادمین** | فقط توسط سوپر ادمین از پنل مدیریت | ساخت **فقط کاربر عادی**، دیدن و پاسخ پیام‌های کاربرانِ خودش |
| **کاربر** | توسط سوپر ادمین یا ادمین | فقط خواندن راهنما + ثبت چک‌باکس پیشرفت + کامنت‌گذاری در فازها |

- پس از نخستین ثبت‌نام، ثبت‌نام عمومی **بسته** می‌شود؛ پیام کاربر عادی به‌طور خودکار به ادمینِ سازنده‌ی خودش می‌رود و پاسخ ادمین زیر همان پیام نمایش داده می‌شود.
- نشست با کوکی `HttpOnly` امضاشده (HMAC-SHA256) با عمر ۱۴ روز.

## دیتابیس (Vercel Blob)

هیچ MongoDB/MySQL/Postgres در کار نیست. سه سند JSON در Blob:

- `accounts.json.enc` — لیست حساب‌ها
- `user-data/<username>.json.enc` — پیشرفت هر کاربر
- `comments.json.enc` — کامنت‌های فازها

چون Blob سرویس خود Vercel است، از تب **Storage → Create Database → Blob** وصل می‌شود و `BLOB_READ_WRITE_TOKEN` خودکار تزریق می‌گردد. محتوای اسناد پیش از نوشتن با **AES-256-GCM** رمزنگاری می‌شود تا URL عمومی Blob لو ندهد. اگر توکن نباشد (توسعه محلی)، همان ساختار به‌صورت فایل خام در `.data/` ذخیره می‌شود.

### متغیرهای محیطی (Vercel → Settings → Environment Variables)

| متغیر | توضیح |
| --- | --- |
| `INVITE_CODE` | کد دعوتی ثبت‌نام سوپر ادمین (پیش‌فرض `ermanian` — حتماً عوض کنید) |
| `AUTH_SECRET` | کلید امضای کوکی/رمزنگاری Blob (حداقل ۱۶ نویسه؛ حتماً تنظیم کنید) |
| `BLOB_READ_WRITE_TOKEN` | با اتصال Blob از تب Storage خودکار تزریق می‌شود |

## استقرار روی Vercel

1. ریپو را به Vercel وصل کنید (Framework: Vite — تشخیص خودکار با `vercel.json`).
2. تب **Storage → Create → Blob** و اتصال به پروژه.
3. `INVITE_CODE` و `AUTH_SECRET` را تنظیم کنید و Deploy.
4. نخستین ثبت‌نام با کد دعوتی → حساب سوپر ادمین → از پنل ادمین بقیه حساب‌ها را بسازید.

## اجرای محلی

```bash
npm install
npm run build      # ساخت dist
npm run start      # سرور Express روی http://127.0.0.1:8787 (api + dist)
# یا توسعه زنده:
npm run start &    # API روی 8787
npm run dev        # Vite روی 5173 با پروکسی /api
```

## آزمون

`npx tsc --noEmit` (تایپ‌چک) و `npm run build` — هر دو سبز. جریان‌های API (bootstrap سوپر ادمین، بسته‌شدن ثبت‌نام، ساخت سلسله‌مراتبی حساب، مسیریابی کامنت به ادمین سازنده، ایزوله‌سازی بین ادمین‌ها، پیشرفت، تغییر رمز، SPA fallback) به‌صورت دستی با curl روی سرور محلی تأیید شده‌اند.
