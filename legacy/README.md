# Ermanian SOC Academy 2.0 | نسخه توسعه‌یافته

این نسخه پروژه پیوست‌شده را حفظ و گسترش می‌دهد؛ بازطراحی جدا از پروژه نیست.

## تغییرات نسخه ۲

- ۴۰ راهنمای هشدار (۳۲ مورد جدید)، ۳۰ درس دوزبانه (۱۶ درس جدید)، ۱۲ تمرین شواهد (۸ تمرین جدید)، ۴۰ اصطلاح (۲۸ مورد جدید).
- ۳۶ مرجع روی دامنه رسمی Splunk، Elastic، Microsoft Learn و CISA، با تاریخ بررسی ۲۰۲۶/۰۹/۰۸ و توضیح نوع استفاده در هر راهنما.
- هر ۴۰ راهنما: داده لازم، چهار گام بررسی، توضیح مجاز، معیار ارجاع، نقطه کور، SPL و pivot آموزشی Elastic با برچسب KQL یا EQL.
- جست‌وجوی جامع میان درس، هشدار، اصطلاح و مقاله منتشرشده؛ فیلتر کتابخانه بر اساس حوزه، شدت و نشان‌ها.
- نشان‌کردن محلی، تب query بدون پاک‌شدن یادداشت، دانلود راهنما/گزارش/کاتالوگ، چاپ با CSS مخصوص، قالب تحویل، چک‌لیست آمادگی و محاسبه precision/recall.
- پشتیبانی بک‌اند از پیشرفت هر ۳۰ درس و یادداشت هر ۴۰ پرونده؛ API و کنترل دسترسی موجود حفظ شده‌اند.
- index.html تک‌فایلی با CSS/JS داخلی است؛ حساب‌ها به server.py نیاز دارند، مطالعه مهمان با بازکردن HTML نیز ممکن است. تنها منبع ظاهری بیرونی فونت Google Fonts با fallback است.

## حدود ادعا و منابع

«مرجع رسمی» یعنی URL ناشر رسمی در پژوهش وب شناسایی شده؛ نه گواهی امنیت پروژه، نه تأیید vendor و نه تضمین دائمی لینک. قوانین این بسته تألیفی و آموزشی‌اند؛ rule pack رسمی، مجموعه استثناها یا کد محصول vendor کپی نشده است. برای استفاده از اصل قانون، license و نسخه صفحه اصلی را بررسی کن.

SPL و KQL/EQL داخل بسته در SIEM واقعی اجرا نشده‌اند. تفاوت دامنه SPL و Elastic عمدی و مستند است؛ هیچ ادعای معادل‌بودن خودکار وجود ندارد. KQL فیلتر است و شمارش/تناوب/threshold نمی‌سازد. قواعد ابری SPL تلاش‌های denied را هم برای triage نمایش می‌دهند؛ موفقیت را در raw و وضعیت جاری تأیید کن.

تمرین‌های ۱ تا ۴ خروجی نمونه ثابت نسخه قبل‌اند. تمرین‌های ۵ تا ۱۲ جدول شواهد گزینش‌شده‌اند، نه خروجی query نمایش‌داده‌شده. هیچ موتور جست‌وجو، ingestion، اتصال SIEM، ارسال alert یا پاسخ عملیاتی اضافه نشده است. داده واقعی محرمانه وارد نکن.

`catalog.json` شناسنامه محتوای آموزشی است، **نه فایل import قانون Elastic یا Splunk**. `HANDBOOK_FA.md` راهنمای کامل فارسی به همراه منابع و queryهاست؛ `SOURCES.md` منشأ و محدوده استفاده را ثبت می‌کند.

## ارتقا از نسخه قبل

سرور قبلی را متوقف و از SQLite و فایل‌های برنامه پشتیبان امن تهیه کن؛ روش backup بخش زیر را بخوان. برای استفاده از DB قبلی، ERM_DB را به مسیر همان DB تنظیم کن. تغییر schema دیتابیس لازم نیست و شناسه‌های درس/پرونده قبلی حفظ شده‌اند. نشان‌ها و چک‌لیست آمادگی localStorage همان مرورگرند، نه sync حساب. کد دعوت اولیه DB قدیمی تغییر نمی‌کند.

## آزمون‌ها

`python test_server.py` هشت گروه آزمون API نسخه اصلی را با DB موقت اجرا می‌کند.
`python test_v2.py` ذخیره همه درس‌ها و پرونده‌ها، جداسازی یادداشت، رد ID نامعتبر و برابری کاتالوگ با allowlist سرور را می‌آزماید.
`node test_content.js` ساختار، render دو زبان، جست‌وجو، فیلتر، منابع و هم‌خوانی شمارش‌ها را بدون SIEM واقعی تست می‌کند (Node فقط برای تست توسعه است، نه اجرای برنامه).
گزارش دقیق اجرای آزمون‌ها در TEST_REPORT.md آمده است. تست syntax JavaScript جای تست مرورگر یا query واقعی نیست.

---

# Ermanian SOC Academy

## شروع سریع

این پروژه یک نسخه پایه قابل‌اجرای محلی است، نه سایتی که از قبل روی اینترنت منتشر شده باشد.
به Python 3.12 یا جدیدتر نیاز دارد؛ وابستگی pip و Node ندارد.

1. فایل ZIP را در یک پوشه استخراج کن.
2. داخل پوشه پروژه اجرا کن: `python server.py` (در بعضی سیستم‌ها `python3 server.py` یا `py server.py`).
3. آدرس دقیق `http://127.0.0.1:8000` را باز کن. از `localhost` به جای آن استفاده نکن؛ بررسی Host/Origin عمداً دقیق است.
4. وارد بخش ثبت‌نام شو. کد دعوت اولیه `ermanian` است.
5. اولین عضو باید کلید OWNER SETUP KEY چاپ‌شده در ترمینال را هم وارد کند.
6. اولین ثبت‌نام موفق، به شکل تراکنشی، سوپرادمین می‌شود؛ اعضای بعدی member هستند.
7. کلید راه‌اندازی فقط برای اولین عضو لازم است. آن را منتشر نکن و حساب مالک را قبل از اشتراک دسترسی بساز.

رمز عبور حداقل ۱۲ نویسه لازم دارد. ایمیل برای ورود استفاده می‌شود؛ مالکیت ایمیل در این نسخه بررسی نمی‌شود و ایمیلی ارسال نخواهد شد.
رمز یکتا و طولانی انتخاب کن. بازیابی خودکار رمز و MFA در این نسخه پیاده‌سازی نشده‌اند.

### امکانات

رابط فارسی/انگلیسی، راست‌به‌چپ/چپ‌به‌راست، فونت Vazirmatn از خانواده وزیر، حالت روشن و تاریک با روشن پیش‌فرض برای مرورگر جدید، طراحی موبایل، ۳۰ درس، ۴۰ پلی‌بوک، ۱۲ تمرین شواهد، ۴۰ اصطلاح، آزمون‌های کوتاه، پیشرفت مطالعه و گزارش پرونده قابل دانلود.

تمام تمرین‌ها ساختگی هستند. این برنامه هیچ اتصال Splunk، موتور اجرای SPL، ingestion، هشدار واقعی، SOAR یا اقدام روی endpoint ندارد.
دکمه خروجی آزمایشگاه فقط جدول نمونه ثابت نمایش می‌دهد.
SPLها نمونه آموزشی‌اند؛ روی Splunk واقعی تست نشده‌اند. قرارداد فیلد، index، sourcetype، EventCode/EventID، Add-on و بازه زمانی را تطبیق بده.
هیچ قاعده‌ای برای «صددرصد فالس‌پازیتیو» تضمین نمی‌شود.
محتوا یک شروع گسترده برای Tier 1 است، نه پوشش کامل همه محصولات، حملات و روش‌های SOC.

### پنل مدیریت

- **superadmin**: مدیریت مقاله‌ها، نقش editor/member، فعال یا غیرفعال کردن اعضا، مشاهده پیشرفت و یادداشت‌های تمرینی و ۱۰۰ فعالیت اخیر، تغییر کد دعوت و بستن ثبت‌نام.
- **editor**: ساخت، ویرایش و انتشار مقاله‌های دوزبانه و متن درس پایه.
- **member**: مطالعه، ذخیره پیشرفت و یادداشت شخصی.
- **guest**: مطالعه محتوای منتشرشده و تمرین؛ پیشرفت و یادداشت مهمان فقط در مرورگر ذخیره می‌شود.

مقاله‌ها متن ساده هستند، نه HTML. برای پاراگراف جدید یک خط خالی بگذار.
برای ویرایش متن درس پایه، در پنل محتوا درس را انتخاب و «باز کردن در ویرایشگر» را بزن؛ نسخه منتشرشده جای متن درس را می‌گیرد. آزمون پایه همچنان جداست.
قالب‌ها، آزمون‌های پایه، پلی‌بوک‌های پایه و منطق آزمایشگاه از کد `index.html` ویرایش می‌شوند؛ صفحه‌ساز عمومی و ویرایشگر خودکار همه اجزای UI وجود ندارد.
مقاله تازه با دسته دلخواه را می‌توان بدون تغییر کد اضافه کرد. بارگذاری فایل و ویدئو، مدیریت دوره چندرسانه‌ای و ویرایش تاریخچه نسخه‌ها پیاده نشده‌اند.
برای برداشتن مقاله از انتشار، گزینه انتشار را غیرفعال و ذخیره کن؛ حذف دائمی از پنل عمداً ارائه نشده است.
مالک اصلی از تنزل/غیرفعال‌سازی محافظت می‌شود. انتقال مالکیت جریان UI ندارد.

### داده‌ها و حریم خصوصی

`academy.sqlite3` هنگام اجرا ساخته می‌شود. حاوی کاربران، هش رمز، هش نشست، مقاله، پیشرفت، یادداشت و audit است.
سوپرادمین ایمیل‌ها، نقش‌ها، وضعیت، پیشرفت، یادداشت‌های تمرینی و فعالیت اعضا را می‌بیند؛ پیش از دعوت این موضوع را به اعضا اطلاع بده.
رمز عبور قابل مشاهده نیست. نشست‌ها به صورت token تصادفی در Cookie با HttpOnly و SameSite=Strict هستند و فقط هش آن‌ها در DB ذخیره می‌شود.
پیشرفت مهمان با ورود خودکار به حساب منتقل نمی‌شود. یادداشت‌ها را پیش از تعویض حالت در صورت نیاز دانلود کن.
در این برنامه لاگ واقعی محرمانه، اطلاعات شخصی سازمان یا فایل مشکوک وارد نکن.
فونت از Google Fonts درخواست می‌شود؛ بدون دسترسی اینترنت فونت سیستمی جایگزین است. این وابستگی را در سیاست حریم خصوصی استقرار لحاظ کن.

برای پشتیبان ساده محلی، برنامه را با Ctrl+C ببند، سپس فایل SQLite را همراه index.html در مخزن امن کپی کن.
برای backup حین کار از SQLite backup API استفاده کن؛ کپی صرف فایل اصلی در حالت WAL کافی نیست.
قبل از اشتراک ZIP یا کد با دیگران DB، فایل‌های WAL/SHM، کلید مالک و sessionها را همراه آن نفرست.

### امنیت پیاده‌سازی و محدودیت‌ها

کنترل دعوت و نقش‌ها سمت سرور، SQL پارامتری، رمز PBKDF2-HMAC-SHA256 با salt تصادفی و ۶۰۰٬۰۰۰ دور، نشست‌های ۲۵۶بیتی با عمر مطلق ۸ ساعت، باطل شدن نشست هنگام تغییر نقش/وضعیت، مقایسه ثابت‌زمان، بررسی دقیق Host و Origin برای CSRF، هدر سفارشی درخواست، محدودیت بدنه، محدودیت تلاش ورود/عضویت در حافظه، سقف درخواست‌های هم‌زمان، escape کردن محتوای کاربر و ثبت فعالیت‌های مهم اجرا شده‌اند.

این موارد ادعای ممیزی امنیتی یا آماده‌بودن برای production نیستند:

- `http.server` فقط برای توسعه محلی است و نباید مستقیماً در اینترنت قرار بگیرد.
- rate limit در حافظه و وابسته به یک process است و با restart پاک می‌شود. پشت proxy همه IPها یکسان دیده می‌شوند مگر طراحی معتمد اضافه شود.
- audit کنونی tamper-evident نیست، همه درخواست‌های نامعتبر/عضویت ناموفق را ثبت نمی‌کند و retention قابل تنظیم ندارد.
- MFA، تأیید ایمیل، بازیابی رمز، رمزنگاری DB در حالت سکون، نسخه‌بندی محتوا، مدیریت دستگاه‌های نشست و retention پیاده نشده‌اند.
- CSP به دلیل رویدادهای inline UI به `unsafe-inline` نیاز دارد. پیش از production، JS را به فایل منتقل و nonce/hash و event listener مناسب استفاده کن.
- تست نفوذ حرفه‌ای انجام نشده است؛ review کد و threat model قبل از دسترسی غیرمحلی ضروری است.
- کد دعوت مشترک `ermanian` ضعیف و قابل اشتراک است. هر دارنده کد می‌تواند عضو شود؛ برای محدودسازی جدی، دعوت تک‌مصرف متصل به ایمیل و تأیید مدیر اضافه کن.
- اولین حساب فقط با invite و کلید setup ترمینال ساخته می‌شود؛ ساخت حساب از روی نام یا ایمیل خاص، بدون تأیید مالکیت، به کسی دسترسی نمی‌دهد.

### تنظیمات اجرا

| Variable | Default | Purpose |
| --- | --- | --- |
| ERM_PORT | 8000 | Local port |
| ERM_BIND | 127.0.0.1 | Loopback only |
| ERM_ORIGIN | http://127.0.0.1:PORT | Exact browser origin |
| ERM_DB | academy.sqlite3 in project | Database location |
| ERM_OWNER_SETUP_KEY | Random each launch | First-account bootstrap secret |
| ERM_INVITE_CODE | ermanian | Initial invite on first database creation only |
| ERM_SECURE_COOKIE | 0 | Set to 1 only with reviewed HTTPS proxy deployment |

پس از ایجاد DB، تغییر ERM_INVITE_CODE کد جاری را عوض نمی‌کند؛ از پنل تنظیمات استفاده کن.
اگر پورت را تغییر می‌دهی، آدرس جدید چاپ‌شده را باز کن.
برای تست API، POST باید JSON با `Origin` دقیق و `X-Ermanian-Request: 1` داشته باشد.
هیچ CORS عمومی یا اعتماد خودکار به X-Forwarded-For وجود ندارد.

### پیش از انتشار عمومی

انتخاب زیرساخت و دامنه، reverse proxy سخت‌گیری‌شده با HTTPS و حفظ Host، ERM_ORIGIN صریح، Cookie Secure، پشتیبان و بازیابی تست‌شده، secret management، rate limit معتمد/توزیع‌شده، MFA و بازیابی امن، کنترل شبکه، مانیتورینگ، retention و بازبینی امنیتی لازم است.
سوپرادمین را پیش از دادن دسترسی به دیگران بساز. کلید setup ترمینال را با هیچ‌کس به اشتراک نگذار.
این بسته گواهی TLS، سرویس ابری، دامنه یا deployment واقعی ایجاد نمی‌کند.

## English quick start

Python 3.12+ is required, with no pip dependencies. Extract the package, run `python server.py`, then open the exact printed URL.
Register with invite `ermanian`; the first account also needs the private OWNER SETUP KEY printed in the server terminal.
The first successful registration atomically becomes superadmin. Later accounts are members regardless of any client-provided role.
Use Administration for bilingual articles, core-lesson text overrides, member roles/status, learning notes, audit and invite settings.
Unpublished articles are hidden from guests and members. Core quizzes, playbooks and layouts remain code-editable rather than CMS-editable.
The backend is a local reference implementation, not a deployed or production-audited service.

This is an educational academy, not a SIEM. No live Splunk connection or arbitrary SPL execution is included.
Queries require environment-specific adaptation and were not run in a real Splunk instance.
False positive, benign true positive and insufficient evidence are treated separately.
Admin visibility includes member emails, progress, notes and recorded activity, never passwords.
The default invitation is shared, not single-use. Rotate it and close registration when appropriate.
Account email ownership verification, password recovery, MFA and production deployment infrastructure are not included.

## Tests

Run `python test_server.py` from the project folder. Tests use a temporary database and loopback port; your real academy database is not modified.
Eight API test groups exercise concurrent first-account bootstrap, authentication, authorization, session revocation/expiry, article publishing, notes isolation, progress, settings, rate limits and CSRF rejection.
JavaScript syntax and bilingual render templates were checked during generation. No live Splunk test or real-browser visual test was performed.

