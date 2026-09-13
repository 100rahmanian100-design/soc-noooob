# آکادمی SOC ارمانیان، راهنمای توسعه‌یافته

نسخه ۲.۰ | آموزشی، بدون تأیید فروشنده و بدون اجرای واقعی SIEM.

## درس‌ها


# نقش تو در SOC Tier 1

## رویداد، هشدار و رخداد یکی نیستند

رویداد یک مشاهده در لاگ است. هشدار خروجی یک قانون تشخیص است؛ الزاماً حمله نیست. رخداد امنیتی پس از ارزیابی شواهد و طبق تعریف سازمان تعیین می‌شود. Tier 1 هویت موجودیت‌ها، بازه زمانی، اهمیت دارایی و کیفیت داده را مشخص می‌کند و نتیجه را مستند می‌سازد.

## اولویت را از اثر واقعی بگیر

Severity قانون را با اولویت پرونده اشتباه نگیر. حساب مدیر دامنه، سرور حیاتی، گسترش روی چند میزبان و شواهد اجرای فعال، اولویت را بالا می‌برند. SLA و ماتریس شدت سازمان را دنبال کن؛ یک امتیاز Risk به‌تنهایی احتمال قطعی آلودگی نیست.

## حد اختیار و تحویل شیفت

بدون مجوز پلی‌بوک، میزبان را ایزوله یا حساب را مسدود نکن. در تحویل بنویس چه دیده‌ای، چه چیز نامعلوم است، چه جست‌وجوهایی انجام شده و چه اقدام فوری لازم است. شواهد حساس را فقط در مخزن مجاز نگه دار و زمان‌ها را با منطقه زمانی ثبت کن.

### آزمون

یک هشدار High بدون اطلاعات دارایی چه معنایی دارد؟

1. رخداد قطعی و آماده ایزوله‌سازی است

2. برای تعیین اولویت به زمینه و شواهد نیاز دارد

پاسخ: 2. شدت قانون فقط یکی از ورودی‌های تصمیم است.

CISA: StopRansomware Guide: https://www.cisa.gov/stopransomware/ransomware-guide


# کیفیت لاگ و نقاط کور

## قبل از تحلیل، داده را اعتبارسنجی کن

وجود sourcetype، آخرین زمان دریافت، تعداد معمول رویداد و مجوز جست‌وجوی index را بررسی کن. _time زمان رویداد و _indextime زمان ایندکس شدن است؛ اختلاف غیرمنتظره می‌تواند تأخیر دریافت یا مشکل ساعت باشد. EventCode ممکن است با EventID یا فیلدهای XML جایگزین شده باشد.

## نرمال‌سازی با حفظ معنای فیلد

host در Splunk لزوماً سیستم قربانی نیست؛ ممکن است جمع‌کننده لاگ باشد. dest، Computer و نام میزبان EDR را مقایسه کن. برای user بین عامل انجام‌دهنده و حساب هدف تفاوت بگذار. raw event را باز کن تا نگاشت اشتباه باعث نسبت دادن رویداد به فرد دیگری نشود.

## دامنه نتیجه‌گیری

اگر Sysmon نصب نیست یا ثبت 4104 فعال نشده، نبود داده دلیلی برای سالم بودن سیستم نیست. retention، همگام‌سازی ساعت و لاگ‌های حذف‌شده را یادداشت کن. نتیجه مناسب در پوشش ناقص می‌تواند «شواهد ناکافی، ارجاع برای بررسی تکمیلی» باشد، نه بستن به عنوان FP.

### آزمون

جست‌وجوی Sysmon صفر نتیجه دارد. اولین کار چیست؟

1. بررسی ورود داده، زمان و مجوزها

2. بستن هشدار به عنوان فالس

پاسخ: 1. ابتدا مشخص کن اصلاً داده قابل اتکایی در دسترس بوده است.

Microsoft Learn: Sysmon: https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon

Splunk: tstats reference: https://help.splunk.com/en/splunk-enterprise/search/spl-search-reference/10.2/search-commands/tstats


# خواندن لاگ‌های Windows و Sysmon

## لاگ‌های Security

4624 ورود موفق، 4625 ورود ناموفق، 4688 ساخت پردازش و 1102 پاک شدن Security log را گزارش می‌کنند. Logon Type 3 شبکه و 10 ورود RemoteInteractive است؛ این‌ها به‌خودی‌خود مخرب نیستند. ثبت CommandLine در 4688 به پیکربندی auditing جداگانه نیاز دارد.

## دید عمیق‌تر با Sysmon

در Sysmon رویداد 1 ساخت پردازش، 3 اتصال شبکه، 10 دسترسی پردازش، 11 ساخت فایل، 13 تنظیم مقدار رجیستری و 22 پرس‌وجوی DNS است. پوشش به تنظیمات Sysmon و فیلترهای آن وابسته است؛ همه رویدادها پیش‌فرض ثبت نمی‌شوند. برای اتصال رویدادها ProcessGuid را به PID تنها ترجیح بده.

## زمینه احراز هویت

Account، LogonId، IpAddress و نام سیستم را در کنار هم بررسی کن. در 4625 کد Status و SubStatus علت شکست را روشن‌تر می‌کنند؛ رمز اشتباه، حساب غیرفعال و محدودیت ورود رفتار یکسانی نیستند. 4768 و 4769 را برای Kerberos در کنترلر دامنه بررسی کن و 4776 را در زمینه اعتبارسنجی NTLM ببین.

### آزمون

بهترین شناسه برای ارتباط پردازش‌های Sysmon چیست؟

1. فقط PID

2. ProcessGuid همراه میزبان و زمان

پاسخ: 2. PID قابل استفاده مجدد است؛ زمینه زمانی و ProcessGuid خطا را کم می‌کنند.

Microsoft Learn: Sysmon: https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon

Splunk: Multiple Users Remotely Failed To Authenticate: https://research.splunk.com/endpoint/80f9d53e-9ca1-11eb-b0d6-acde48001122/


# درخت پردازش، PowerShell و EDR

## پدر، فرزند و مسیر

مسیر فایل، امضای دیجیتال، هش، کاربر، سطح دسترسی و parent process را کنار هم قرار بده. اجرای PowerShell توسط Word با اجرای آن توسط ابزار مدیریت سازمانی یکسان نیست. فایل امضاشده هم ممکن است برای کار مخرب استفاده شود؛ نام و امضا شواهد کمکی‌اند، نه حکم نهایی.

## PowerShell را فقط از روی -enc قضاوت نکن

4688 یا Sysmon 1 را با 4104 و اتصالات شبکه مرتبط کن. ثبت Script Block باید فعال باشد و یک اسکریپت ممکن است در چند رویداد تقسیم شود. محتوای رمزگذاری‌شده را فقط در ابزار تحلیل ایمن decode کن، نه با اجرای آن. اسکریپت مدیریتی هم ممکن است از encoding استفاده کند.

## خروجی EDR را دقیق بخوان

Detected با blocked و quarantined فرق دارد. موفقیت پاک‌سازی را همراه رفتار قبل و بعد بررسی کن؛ مسدود شدن یک فایل، نبودن persistence یا سرقت قبلی را ثابت نمی‌کند. برای hash lookup ابتدا سیاست اشتراک داده را بررسی کن؛ فایل یا اسکریپت محرمانه را در سرویس عمومی بارگذاری نکن.

### آزمون

یک فایل امضای معتبر دارد. آیا سالم است؟

1. بله، می‌توان هشدار را بست

2. خیر، رفتار و زنجیره اجرا هم لازم است

پاسخ: 2. ابزارهای معتبر هم در حملات Living off the Land استفاده می‌شوند.

Microsoft Learn: Sysmon: https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon

Splunk: Malicious PowerShell: https://research.splunk.com/stories/malicious_powershell/


# ماندگاری، دسترسی به اعتبارنامه و باج‌افزار

## ردپای ماندگاری

ساخت سرویس را در System 7045 یا Security 4697 در صورت فعال بودن auditing بررسی کن. ساخت Scheduled Task در 4698 و تغییر Run keys در تله‌متری رجیستری اهمیت دارند. سازنده، مسیر اجرایی، زمان ایجاد، ticket تغییر و اولین اجرای واقعی را ثبت کن؛ صرف ایجاد سرویس دلیل حمله نیست.

## دسترسی به LSASS

دسترسی به lsass.exe در Sysmon 10 را با SourceImage، GrantedAccess، CallTrace در صورت وجود و زمینه EDR بررسی کن. ابزار امنیتی و diagnostic هم ممکن است چنین دسترسی‌ای داشته باشند. ابزار ناشناخته، dump file یا زنجیره اجرای مشکوک در کنار آن، دلیل ارجاع برای credential access است.

## باج‌افزار: زمان مهم است

تغییر گسترده فایل‌ها، پسوندهای تازه، ransom note و رفتار حذف نسخه پشتیبان را هم‌بسته کن. اگر رمزگذاری فعال محتمل است طبق مسیر فوری سازمان به Tier 2 یا Incident Response اطلاع بده. برای تکمیل تمام چک‌ها منتظر نمان؛ اقدام containment فقط طبق مجوز و با ثبت زمان انجام شود.

### آزمون

رمزگذاری فعال روی چند سرور دیده می‌شود. چه می‌کنی؟

1. ارجاع فوری طبق پلی‌بوک و ثبت شواهد

2. صبر تا پایان همه جست‌وجوها

پاسخ: 1. تحلیل نباید پاسخ به تهدید فعال را بی‌دلیل عقب بیندازد.

Splunk: BlackSuit Ransomware: https://research.splunk.com/stories/blacksuit_ransomware/

Microsoft Learn: Sysmon: https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon


# اندپوینت‌های Linux و کنترل‌های پایه

## منابع داده لینوکس

بسته به توزیع، auth.log، secure، journald و auditd را بررسی کن. SSH failed و accepted login، sudo و تغییرات کاربر منابع مهم‌اند. لاگ shell history کامل یا قابل اتکا نیست؛ ثبت execve در auditd و داده EDR در صورت پیکربندی، دید بهتری از اجرای پردازش می‌دهند.

## تغییرات حساس

تغییر authorized_keys، cron، واحدهای systemd و حساب‌های دارای امتیاز را با مالک سیستم تطبیق بده. IP ابزار مدیریت، پنجره تغییر و دستور مجاز را بررسی کن. فعالیت root به‌تنهایی کافی نیست، اما ورود جدید از مبدأ غیرمعمول همراه تغییر ماندگاری باید ارجاع شود.

## کنترل‌های پیشگیرانه و کشف

حداقل دسترسی، patching، MFA برای دسترسی مدیریتی، محدودسازی شبکه و پشتیبان قابل بازیابی سطح خطر را کم می‌کنند. EDR و SIEM جایگزین این کنترل‌ها نیستند. در پرونده بنویس کدام کنترل فعال بوده، چه چیزی را مسدود کرده و چه نقاط کوری باقی مانده است.

### آزمون

آیا نبود دستور در shell history نبود اجرا را ثابت می‌کند؟

1. بله

2. خیر، تاریخچه ممکن است ناقص یا تغییرکرده باشد

پاسخ: 2. به منابع مستقل اجرا و احراز هویت تکیه کن.

Elastic: Persistence via File Modification: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/fim/persistence_suspicious_file_modifications

Elastic: Cron Job Created or Modified: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/linux/persistence_cron_job_creation


# شبکه برای تحلیلگر SOC

## پنج‌تایی و جهت ترافیک

src IP، src port، dest IP، dest port و protocol مبنای اتصال‌اند. جهت outbound را از جایگاه سنسور و subnetها تعیین کن، نه فقط نام فیلد. NAT، DHCP، VPN و proxy می‌توانند یک IP را به چند کاربر مرتبط کنند؛ نگاشت زمان‌مند برای نسبت دادن فعالیت لازم است.

## DNS و HTTPS

DNS نام را resolve می‌کند و می‌تواند برای C2 هم سوءاستفاده شود. query، نوع رکورد، پاسخ و نرخ درخواست را ببین. در HTTPS معمولاً محتوای رمزگذاری‌شده دیده نمی‌شود؛ SNI در صورت قابل مشاهده بودن، گواهی و فراداده کمک می‌کنند. نبود URL کامل یا SNI را به معنی نبود اتصال نگذار.

## پورت به معنی برنامه قطعی نیست

443 اغلب HTTPS، 53 اغلب DNS، 445 اغلب SMB و 3389 معمولاً RDP است، اما برنامه‌ها می‌توانند روی پورت دیگر باشند. برای تشخیص از app identification، لاگ مقصد و پردازش مبدأ کمک بگیر. allowed در firewall فقط مجاز بودن عبور را نشان می‌دهد، نه موفقیت برنامه یا بی‌خطر بودن ترافیک.

### آزمون

یک IP پشت NAT دیده شده؛ می‌توان کاربر را قطعی شناخت؟

1. فقط با IP خیر؛ نگاشت زمان‌مند لازم است

2. بله، هر IP فقط یک کاربر دارد

پاسخ: 1. زمان، پورت و لاگ‌های NAT یا VPN می‌توانند برای نسبت دادن لازم باشند.

Splunk: Suspicious DNS Traffic: https://research.splunk.com/stories/suspicious_dns_traffic/

Splunk: Cobalt Strike: https://research.splunk.com/stories/cobalt_strike/


# Firewall، Proxy، IDS و تحلیل DNS

## چند زاویه دید را کنار هم بگذار

Firewall درباره session و policy، proxy درباره درخواست وب، IDS درباره تطبیق signature و EDR درباره پردازش مبدأ اطلاعات می‌دهند. یک signature ممکن است تلاش ناموفق یا ترافیک scanner را ببیند. action، bytes، مدت اتصال و نتیجه روی مقصد را کنار signature بررسی کن.

## Beaconing و خروج داده

اتصال دوره‌ای و حجم خروجی بالا نشانه‌اند، نه اثبات. ابزار monitoring، sync و backup هم این الگوها را دارند. با baseline همان دارایی در ساعت مشابه مقایسه کن و مقصد، برنامه مالک، نسبت ارسال به دریافت و تغییر ناگهانی رفتار را بررسی کن. اسکن رمزگذاری‌شده محدودیت دید دارد.

## دام‌های تحلیل DNS

طول زیاد query، زیر‌دامنه‌های یکتا و NXDOMAIN زیاد می‌توانند از telemetry یا CDN ناشی شوند. نرخ و نوع رکورد را با پردازش endpoint هم‌بسته کن. جدا کردن دو قسمت آخر نام دامنه برای همه دامنه‌ها درست نیست؛ برای registered domain از نگاشت معتبر Public Suffix استفاده کن.

### آزمون

ارسال حجیم شبانه به‌تنهایی نشانه قطعی سرقت است؟

1. بله

2. خیر، مقصد، baseline و مالکیت backup را بررسی کن

پاسخ: 2. رفتار غیرعادی باید در زمینه همان دارایی ارزیابی شود.

Microsoft Learn: Sysmon: https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon

Splunk: Suspicious DNS Traffic: https://research.splunk.com/stories/suspicious_dns_traffic/


# هویت، MFA، VPN و فیشینگ

## Brute force و password spray

تلاش‌های زیاد روی یک حساب می‌تواند brute force باشد؛ چند تلاش روی حساب‌های بسیار می‌تواند spray باشد. شمارش را با src، user، dest و پنجره زمانی حفظ کن. شکست و موفقیت در یک bucket اثبات نمی‌کند موفقیت بعد از شکست بوده؛ ترتیب واقعی رویدادها را بررسی کن.

## MFA و جغرافیای ورود

MFA موفق هم تضمین سلامت نیست؛ سرقت session یا تأیید ناخواسته ممکن است رخ دهد. impossible travel به خروجی VPN و خطای GeoIP حساس است. device، session، ASN، روش MFA و رفتار پس از ورود را ببین و تأیید کاربر را از کانال مستقل بگیر.

## تحلیل فیشینگ بدون اجرای محتوا

Message-ID، هدر، envelope sender، Reply-To، نتایج SPF/DKIM/DMARC و گیرندگان را ثبت کن. pass شدن احراز دامنه سالم بودن پیام را ثابت نمی‌کند. مقصد واقعی لینک و تله‌متری کلیک، دانلود و پردازش را بررسی کن؛ لینک یا پیوست را روی سیستم کاری باز نکن.

### آزمون

MFA موفق برای بستن هشدار ورود کافی است؟

1. خیر، session، دستگاه و فعالیت بعدی مهم‌اند

2. بله، هویت کاملاً تأیید شده

پاسخ: 1. عامل دوم ریسک را کاهش می‌دهد؛ تضمین عدم سوءاستفاده نیست.

Elastic: Entra ID MFA Disabled: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/azure/persistence_entra_id_mfa_disabled_for_user

Splunk: Multiple Users Remotely Failed To Authenticate: https://research.splunk.com/endpoint/80f9d53e-9ca1-11eb-b0d6-acde48001122/


# شناخت Splunk و مسیر داده

## از جمع‌آوری تا جست‌وجو

Forwarder داده را ارسال، indexer آن را پردازش و ذخیره و search head جست‌وجو را هماهنگ می‌کند؛ معماری واقعی می‌تواند متفاوت باشد. index مجموعه داده و sourcetype قالب و قواعد پردازش آن را مشخص می‌کند. با index محدود و بازه زمانی مشخص شروع کن، نه index=* و all time.

## Enterprise Security و یافته‌ها

Splunk Enterprise Security امکانات امنیتی روی پلتفرم Splunk ارائه می‌کند و نیازمند نصب و مجوز مربوط است. اصطلاح Finding، Notable و محل بررسی با نسخه فرق می‌کند. جزئیات detection، زمان اجرای search، drilldown و موجودیت‌های تحت تأثیر را باز کن؛ عنوان alert همه منطق قانون را نمی‌گوید.

## زمان و حفظ شواهد

بازه جست‌وجوی detection را عیناً ثبت کن، سپس برای زمینه چند دقیقه قبل و بعد را بررسی و بر اساس شواهد گسترش بده. زمان نسبی برای کار روزمره خوب است، اما در تحویل زمان شروع و پایان مطلق با timezone بده. SPL، job reference در صورت پایدار بودن و نمونه raw را در محل مجاز ثبت کن.

### آزمون

بهترین شروع یک جست‌وجوی بررسی چیست؟

1. همه indexها در تمام زمان‌ها

2. index مرتبط و بازه زمانی مشخص

پاسخ: 2. دامنه محدود سرعت، دقت و قابلیت تکرار را بهتر می‌کند.

Splunk: tstats reference: https://help.splunk.com/en/splunk-enterprise/search/spl-search-reference/10.2/search-commands/tstats


# SPL کاربردی برای Tier 1

## جست‌وجو را مرحله‌به‌مرحله بساز

ابتدا index، sourcetype و زمان را محدود کن، raw event را ببین، بعد fields یا table برای خروجی مشخص استفاده کن. stats count by user شمارش می‌دهد؛ values(dest) زمینه چندمقداری و dc(dest) تعداد مقصد یکتا را نگه می‌دارند. پس از stats فیلدهای تجمیع‌نشده از خروجی حذف می‌شوند.

## eval، where و bin

eval فیلد محاسباتی می‌سازد و where برای شرط روی آن مناسب است. با bin _time span=5m رخدادها را bucket کن؛ مرز bucket می‌تواند یک دنباله حمله را بشکند. sort 0 + _time ترتیب صعودی بدون محدودیت پیش‌فرض sort می‌دهد، اما برای داده زیاد هزینه دارد؛ ابتدا دامنه را کم کن.

## صفر نتیجه و فیلدهای خالی

از نام index و فیلدهای همین محیط استفاده کن؛ مثال‌های این سایت قرارداد آموزشی دارند. فیلتر را تدریجی حذف کن و extraction را بررسی کن. coalesce فقط فیلدهای هم‌معنی را جایگزین کند. dedup بی‌دلیل ممکن است شواهد تکرار را حذف کند و join یا subsearch محدودیت حجم و زمان دارند.

### آزمون

بعد از stats چرا CommandLine ناپدید شده؟

1. چون گروه‌بندی یا تجمیع نشده است

2. چون داده از index حذف شد

پاسخ: 1. stats ساختار خروجی را تغییر می‌دهد، نه داده ذخیره‌شده را.

Splunk: tstats reference: https://help.splunk.com/en/splunk-enterprise/search/spl-search-reference/10.2/search-commands/tstats


# CIM، tstats و Risk-Based Alerting

## CIM قرارداد معناست

Common Information Model نام و معنای مشترک برای داده‌های چند vendor فراهم می‌کند. برای Authentication نگاشت user، src، dest و action را اعتبارسنجی کن. نصب Add-on به‌تنهایی تضمین کامل بودن مدل نیست؛ eventtype، tag، extraction و داده ورودی باید با مدل تطبیق داشته باشند.

## tstats و خطر خلاصه ناقص

tstats از فیلدهای indexed یا مدل داده استفاده می‌کند؛ جایگزین عمومی search روی هر فیلد دلخواه نیست. summariesonly=true فقط summary را می‌بیند و داده خلاصه‌نشده را کنار می‌گذارد. برای بررسی کامل‌تر false را در نظر بگیر و پوشش مدل، تأخیر acceleration و مقایسه با raw را بررسی کن.

## Risk را با احتمال اشتباه نگیر

در RBA چند سیگنال برای یک موجودیت جمع می‌شوند و ممکن است به finding منجر شوند. امتیاز 80 به معنی احتمال 80 درصد آلودگی نیست. mapping اشتباه user یا dest، تکرار قانون و وزن‌های نامناسب می‌تواند امتیاز را منحرف کند؛ سیگنال‌های سازنده و بازه تجمیع را بخوان.

### آزمون

summariesonly=true چه داده‌ای را ممکن است از دست بدهد؟

1. داده‌ای را از دست نمی‌دهد

2. داده‌های هنوز خلاصه‌نشده

پاسخ: 2. سریع‌تر بودن می‌تواند با کاهش پوشش همراه باشد.

Splunk: tstats reference: https://help.splunk.com/en/splunk-enterprise/search/spl-search-reference/10.2/search-commands/tstats


# روال تریاژ از ابتدا تا ارجاع

## ۱. اعتبارسنجی و زمینه

زمان و منطق قانون، موجودیت، مالک دارایی و پوشش داده را مشخص کن. آیا قانون threshold است یا رفتار مشخص؟ آیا زمان‌بندی و lookback رویداد تکراری ساخته؟ با CMDB، هویت سازمانی و تغییرات مصوب زمینه بگیر. اجازه نده label شدت جای تحقیق را بگیرد.

## ۲. خط زمانی و دامنه

در یک پنجره اولیه محدود، پردازش، ورود، DNS و شبکه را هم‌بسته کن. سپس همان user، hash یا مقصد را روی سایر دارایی‌های مرتبط جست‌وجو کن. هم‌زمانی رابطه علت و معلولی را ثابت نمی‌کند؛ شناسه process، session و داده مستقل را برای پیوند دادن لازم داری.

## ۳. تصمیم با شرایط توقف

اجرای مخرب محتمل، حساب حساس، گسترش، سرقت داده یا خلأ مهم تله‌متری را طبق ماتریس سازمان ارجاع بده. برای رخداد فعال منتظر قطعیت نمان. اگر فعالیت مجاز اثبات شد، دامنه تأیید، مدارک، محدودیت‌ها و دلیل بستن را بنویس. tuning قانون باید کنترل تغییر و بازبینی داشته باشد.

### آزمون

هم‌زمانی دو رویداد چه چیزی را ثابت می‌کند؟

1. فقط هم‌زمانی، نه رابطه علّی

2. حتماً یک پردازش هر دو را ساخته

پاسخ: 1. برای پیوند قوی‌تر از شناسه‌ها و منابع مستقل استفاده کن.

Elastic: Windows Script Executing PowerShell: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/windows/initial_access_script_executing_powershell

CISA: StopRansomware Guide: https://www.cisa.gov/stopransomware/ransomware-guide


# فالس‌پازیتیو، فعالیت مجاز و بستن پرونده

## چهار نتیجه را جدا نگه دار

True Positive یعنی رفتار موردنظر قانون واقعاً رخ داده و در زمینه امنیتی نیازمند پاسخ است. Benign True Positive یعنی قانون رفتار را درست دیده ولی فعالیت مجاز است. False Positive می‌تواند ناشی از منطق یا parsing غلط باشد. Inconclusive یعنی شواهد کافی نیست. نام نهایی وضعیت‌ها را با taxonomy سازمان هماهنگ کن.

## چه شواهدی برای بستن لازم است؟

در نمونه اسکریپت مدیریتی، ticket معتبر، تأیید مالک از کانال مستقل، تطبیق زمان و میزبان و فرمان مورد انتظار و نبود شواهد متناقض در تله‌متری موجود را ثبت کن. نام شناخته‌شده فایل، IP داخلی، امضای معتبر، reputation تمیز یا حرف کاربر به‌تنهایی کافی نیست. پوشش و محدودیت بررسی را صریح بنویس.

## بستن مسئولانه و tuning محدود

خلاصه پرونده باید پاسخ دهد چه شد، کجا، چه وقت، برای چه کسی و چرا این تصمیم گرفته شد. استثنا را به ابزار، میزبان، حساب و بازه معتبر محدود کن؛ allowlist کلی PowerShell یا حساب مدیر خطرناک است. برای استثنا مالک، تاریخ انقضا و بازبینی تعیین کن. «چیزی ندیدم» را جای «فعالیت مجاز تأیید شد» ننویس.

### آزمون

ticket معتبر با اسکریپت دقیقاً منطبق است؛ قانون هم درست عمل کرده. برچسب مناسب؟

1. Benign True Positive طبق taxonomy سازمان

2. قطعاً خطای تشخیص و FP

پاسخ: 1. تشخیص درست فعالیت مجاز با خطای قانون یکسان نیست.

Elastic: Windows Script Executing PowerShell: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/windows/initial_access_script_executing_powershell

CISA: StopRansomware Guide: https://www.cisa.gov/stopransomware/ransomware-guide


# قرارداد فیلد: raw، ECS و CIM

## مفهوم و هدف

host در Splunk ممکن است collector باشد، نه endpoint. Computer، dest و host.name را با raw و inventory تطبیق بده. استانداردکردن نام بدون حفظ معنا تحلیل را خراب می‌کند. SubjectUserName معمولاً actor و TargetUserName حساب هدف است؛ این دو را یکی نکن.

## روش بررسی

زمان وقوع، مشاهده و ingestion را جدا ثبت کن. timezone، clock skew و نوع فیلد را بررسی کن؛ اختلاف منفی را خودکار صفر نکن. GUID پردازش را میان process، network و file با چند نمونه واقعی تطبیق بده؛ PID بدون host و زمان قابل اتکا نیست.

## اشتباه رایج و تمرین

از هر source پنج raw event با outcome متفاوت انتخاب و mapping، nullها و field type را مستند کن. برای این پروژه هر index فرضی باید با جدول mapping محیط جایگزین شود. خطای parsing را FP داده‌ای ثبت کن، نه فعالیت مجاز کاربر.

### آزمون

rename کردن host به host.name کافی است؟

1. نه؛ معنا و mapping باید تأیید شوند

2. بله، نام استاندارد کافی است

پاسخ: 1. هم‌معنایی مهم‌تر از هم‌نامی است.

Microsoft Learn: Sysmon: https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon

Elastic: EQL syntax: https://www.elastic.co/docs/reference/query-languages/eql/eql-syntax

Splunk: tstats reference: https://help.splunk.com/en/splunk-enterprise/search/spl-search-reference/10.2/search-commands/tstats


# KQL برای تریاژ سریع

## مفهوم و هدف

Kibana Query Language فقط سند را فیلتر می‌کند؛ stats، sort یا sequence ندارد. آن را با Microsoft Kusto Query Language که مخفف یکسان دارد اشتباه نگیر. data view و بازه زمان در UI/API جدا تنظیم می‌شوند.

## روش بررسی

field:* وجود مقدار indexed را می‌سنجد نه معتبر بودن آن را. keyword عموماً exact و حساس به حروف است؛ text تحلیل می‌شود. برای AND/OR پرانتز بگذار و با raw مقایسه کن. leading wildcard ممکن است با تنظیم محیط محدود شده باشد.

## اشتباه رایج و تمرین

از source/category شروع کن، سپس entity و outcome را اضافه کن. failure filter را brute-force detector ننام؛ شمارش و آستانه قانون باید جدا تعریف شوند. نمونه عملی: event.category:authentication and event.outcome:failure را در بازه محدود بررسی و user/source را دستی اعتبارسنجی کن.

### آزمون

برای شمارش شکست‌ها بر اساس user چه لازم است؟

1. فقط KQL

2. aggregation یا threshold جدا

پاسخ: 2. فیلتر سند با تشخیص الگوی حجمی فرق دارد.

Elastic: Kibana Query Language: https://www.elastic.co/docs/reference/query-languages/kql


# EQL و توالی رویداد

## مفهوم و هدف

sequence رویدادها را با ترتیب مشخص توصیف می‌کند. host مشترک به معنی process مشترک نیست؛ برای دانلود و اجرا entityهای درست و timestamp معتبر لازم‌اند. رویدادهای پیش‌فرض EQL از event.category و @timestamp استفاده می‌کنند.

## روش بررسی

join key و maxspan را بر اساس رفتار انتخاب کن. process.entity_id خالی ممکن است join نشود. maxspan با look-back و فاصله اجرای قانون متفاوت است؛ یکی مدت زنجیره، یکی بازه search و دیگری schedule است.

## اشتباه رایج و تمرین

fixture با رویداد دیررس، timestamp یکسان، GUID متفاوت و رویداد گمشده بساز. tiebreaker معتبر برای زمان برابر لازم است. sequence مطابق query هم علیت را به‌تنهایی ثابت نمی‌کند؛ parent/child و محتوای رفتار را بررسی کن.

### آزمون

دو event روی یک host یک process هستند؟

1. نه؛ identity و زمان باید پیوند معتبر داشته باشند

2. بله

پاسخ: 1. join ضعیف زنجیره حمله کاذب می‌سازد.

Elastic: EQL syntax: https://www.elastic.co/docs/reference/query-languages/eql/eql-syntax


# ES|QL برای تحلیل و aggregation

## مفهوم و هدف

ES|QL با FROM شروع و با WHERE، EVAL، STATS و SORT داده را تبدیل می‌کند. این زبان EQL نیست؛ sequence با syntax EQL را نمی‌توان در آن چسباند. امکانات با نسخه تغییر می‌کنند، پس مرجع نسخه نصب‌شده را بخوان.

## روش بررسی

پس از STATS فقط گروه‌ها و aggregate باقی می‌مانند؛ host/user لازم برای triage را آگاهانه نگه دار. count سند برابر رخداد واقعی نیست اگر duplicate یا split event داری. بازه زمان، missing fields و sample size را کنار آمار ثبت کن.

## اشتباه رایج و تمرین

تمرین: روی داده آزمایشگاهی ابتدا FROM و LIMIT، سپس WHERE و نهایتاً STATS بنویس. پس از هر مرحله شمارش و schema را مقایسه کن. نتیجه aggregate برای alert به schedule، تست و suppression مستقل نیاز دارد.

### آزمون

EQL و ES|QL یک زبان هستند؟

1. بله

2. نه، هدف و syntax متفاوت است

پاسخ: 2. EQL الگوی رویداد و ES|QL pipeline تحلیلی است.

Elastic: ES|QL reference: https://www.elastic.co/docs/reference/query-languages/esql


# چرخه عمر قانون تشخیص

## مفهوم و هدف

با رفتار هدف، دلیل تهدید، source و field لازم شروع کن. query، severity، threshold و schedule را جدا مستند کن. MITRE mapping طبقه‌بندی است؛ یک T-ID به معنی تشخیص تمام آن تکنیک نیست.

## روش بررسی

تست مثبت، منفی، BTP، missing-field، delayed، duplicate و window boundary بساز. مثبت یعنی predicate هدف دیده شد، نه الزاماً malware. syntax، مصرف منابع و حجم مشابه تولید را جدا بسنج. برای استثنا owner و expiry لازم است.

## اشتباه رایج و تمرین

با shadow mode شروع، خروجی را با analyst review و سپس rollout محدود منتشر کن. version، rollback و معیار کیفیت را ثبت کن. پس از parser/integration change، regression را تکرار کن. هیچ query این بسته روی SIEM واقعی اجرا نشده است.

### آزمون

یک fixture مثبت برای production کافی است؟

1. نه، منفی‌ها و schema و بار و rollout لازم‌اند

2. بله

پاسخ: 1. تست محلی فقط همان نمونه و قرارداد را تأیید می‌کند.

Elastic: Windows Script Executing PowerShell: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/windows/initial_access_script_executing_powershell

Elastic: EQL syntax: https://www.elastic.co/docs/reference/query-languages/eql/eql-syntax


# تنظیم هشدار بدون ازدست‌دادن دید

## مفهوم و هدف

خروجی را به FP، BTP، inconclusive و malicious طبق taxonomy سازمان تقسیم کن. قانون پرحجم شاید حمله واقعی، rollout نرم‌افزار یا خرابی parser را نشان دهد. کاهش تعداد alert به‌خودی‌خود بهبود کیفیت نیست.

## روش بررسی

استثنا را به app/version/path تأییدشده، hostهای مشخص و workflow محدود کن؛ کل SYSTEM یا PowerShell را حذف نکن. ticket، owner، expiry و دلیل بنویس. hash با update عوض می‌شود؛ مسیر معتبر هم قابل سوءاستفاده است.

## اشتباه رایج و تمرین

قبل/بعد volume، precision نمونه reviewشده و positive fixtureها را مقایسه کن. recall بدون مجموعه حملات واقعی یا آزمون معتبر denominator ندارد. تمرین: برای یک job مصوب استثنایی بنویس که نمونه مشکوک مشابه را همچنان بگیرد.

### آزمون

کدام استثنا بهتر است؟

1. همه ادمین‌ها

2. workflow مشخص با owner و expiry

پاسخ: 2. کم‌کردن noise نباید پوشش را کور کند.

Splunk: Windows Possible Credential Dumping: https://research.splunk.com/endpoint/e4723b92-7266-11ec-af45-acde48001122/

Elastic: Windows Script Executing PowerShell: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/windows/initial_access_script_executing_powershell


# دید امنیتی AWS و شکاف لاگ

## مفهوم و هدف

control plane مثل IAM change با data plane مثل GetObject فرق دارد. روشن بودن trail تضمین ثبت همه data eventها نیست؛ selector، account و region را صریح مستند کن. AWS Config هم تاریخچه تنظیمات است، نه معادل کامل CloudTrail.

## روش بررسی

actor ARN را همراه identity type، session issuer و شناسه access key بررسی کن. assumed role ممکن است automation یا federation باشد؛ role name هویت انسانی نیست. secret را وارد گزارش نکن. خطای API را از موفقیت و وضعیت فعلی جدا کن.

## اشتباه رایج و تمرین

پس از restore، دریافت واقعی لاگ و selectors و destination/KMS access را تست کن. از منابع مستقل برای شکاف استفاده کن؛ درباره زمان بی‌دید صریح باش. حذف trail لزوماً حذف لاگ‌های تاریخی ذخیره‌شده نیست.

### آزمون

IsLogging=true یعنی همه GetObjectها ثبت می‌شوند؟

1. نه؛ data-event selectors را بررسی کن

2. بله

پاسخ: 1. فعال‌بودن با پوشش کامل متفاوت است.

Elastic: AWS CloudTrail Log Suspended: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/aws/defense_evasion_cloudtrail_logging_suspended

Elastic: CloudTrail Management Events Disabled: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/aws/defense_evasion_cloudtrail_management_events_disabled_via_eventselectors

Elastic: S3 Server Access Logging Disabled: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/aws/defense_evasion_s3_bucket_server_access_logging_disabled

Elastic: AWS Config Recorder Stopped: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/aws/defense_evasion_configuration_recorder_stopped


# تریاژ هویت در Entra ID

## مفهوم و هدف

audit تغییر config را از sign-in جدا کن. actor تغییر MFA ممکن است helpdesk یا app و target شخص دیگری باشد. correlation ID کمک می‌کند ولی همه eventهای یک incident الزاماً ID مشترک ندارند.

## روش بررسی

MFA موفق پایان تحلیل نیست: method، device، app، session و فعالیت بعدی را ببین. geo anomaly می‌تواند VPN یا shared egress باشد؛ برای user از کانال مستقل تأیید بگیر و با شواهد نشست تطبیق بده.

## اشتباه رایج و تمرین

با IAM نشست‌ها، MFA methods، role و consentهای غیرمجاز را بررسی کن. password reset به‌تنهایی تمام tokenها یا app grants را حذف نمی‌کند. revoke و policy change باید با مجوز و ارزیابی اثر کسب‌وکار باشد.

### آزمون

در MFA change چه کسی را بررسی کنیم؟

1. فقط target

2. actor و target و نشست‌های مرتبط

پاسخ: 2. اختلاط actor و target مسیر تصاحب را پنهان می‌کند.

Elastic: Entra ID MFA Disabled: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/azure/persistence_entra_id_mfa_disabled_for_user

Elastic: M365 High-Risk Permission Delegated: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/o365/persistence_exchange_suspicious_mailbox_permission_delegation


# از mailbox rule تا BEC

## مفهوم و هدف

Inbox rule، mailbox forwarding و transport rule scope یکسان ندارند؛ آخری می‌تواند جریان سازمانی را تغییر دهد. action و پارامتر را با عنوان alert یکی نکن. FullAccess، SendAs و SendOnBehalf هم حق‌های متفاوت‌اند.

## روش بررسی

ساخت rule یا دادن permission، دسترسی یا خروج واقعی را ثابت نمی‌کند. message trace و access/send logs موجود را بررسی و coverage gaps را ثبت کن. مقصد را parse و exact-match کن؛ evil-example.com متعلق به example.com نیست.

## اشتباه رایج و تمرین

ورود، MFA change، delegation، forwarding و ارسال مالی را در timeline با evidence ID ثبت کن. response را با IAM، messaging و fraud هماهنگ کن. حذف rule تنها، session و persistenceهای دیگر را از بین نمی‌برد.

### آزمون

ساخت forwarding rule چه چیزی را ثابت می‌کند؟

1. config تغییر کرده؛ ارسال واقعی مدرک دیگری می‌خواهد

2. همه ایمیل‌ها خارج شده‌اند

پاسخ: 1. configuration و data transfer دو مرحله‌اند.

Elastic: M365 Inbox Forwarding Rule: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/o365/collection_exchange_new_inbox_rule

Elastic: M365 High-Risk Permission Delegated: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/o365/persistence_exchange_suspicious_mailbox_permission_delegation

Elastic: M365 Transport Rule Created: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/o365/exfiltration_exchange_transport_rule_creation


# لینوکس: auditd، journal و FIM

## مفهوم و هدف

FIM تغییر فایل را می‌بیند ولی همیشه process نویسنده ندارد. auditd می‌تواند effective UID، audit UID و EXECVE بدهد؛ چند record ممکن است یک event serial داشته باشند. journal برای unit execution و نشست مکمل است.

## روش بررسی

root در container الزاماً همان اختیار host root را ندارد. host، container ID، namespace و mount را ثبت کن؛ path و clock را در context درست بخوان. sudoers و SSH را با effective policy و actual login پیوند بده.

## اشتباه رایج و تمرین

cron، systemd، profile و SSH را با diff، owner و writer بررسی کن؛ محتوا را اجرا نکن. پیش از اصلاح مجاز نسخه شواهد و permissionها را حفظ کن. تغییر یک فایل اثبات execution یا پاک‌شدن همه persistenceها نیست.

### آزمون

هر FIM alert فرمان نویسنده را دارد؟

1. خیر، telemetry مکمل ممکن است لازم باشد

2. بله

پاسخ: 1. توان واقعی integration را از raw بررسی کن.

Elastic: Persistence via File Modification: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/fim/persistence_suspicious_file_modifications

Elastic: Cron Job Created or Modified: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/linux/persistence_cron_job_creation

Elastic: Systemd Service Created: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/linux/persistence_systemd_service_creation


# شبکه فراتر از IP reputation

## مفهوم و هدف

src ممکن است NAT یا resolver باشد؛ bytes_out باید نسبت به endpoint تعریف شود. مجموع رفت‌وبرگشت را exfiltration ننام. DNS، TLS metadata و flow مکمل‌اند ولی محتوای session را الزاماً نشان نمی‌دهند.

## روش بررسی

برای beacon تعداد gap معتبر، coefficient of variation و role دستگاه را ثبت کن. monitoring هم تناوب دارد؛ jitter، sampling و retry فاصله را عوض می‌کنند. این آمار برای اولویت‌بندی است، نه نسبت‌دادن قطعی به خانواده malware.

## اشتباه رایج و تمرین

IP، domain، process hash و user را با زمان ترکیب کن. reputation تاریخ‌دار و shared hosting چندمستأجری است. DNS محرمانه و URL دارای token را عمومی upload نکن؛ ابزار enrichment مصوب استفاده کن.

### آزمون

تناوب یک دقیقه‌ای قطعاً C2 است؟

1. نه؛ process، baseline و مقصد را بررسی کن

2. بله

پاسخ: 1. healthcheck سالم هم چنین الگو دارد.

Splunk: Cobalt Strike: https://research.splunk.com/stories/cobalt_strike/

Splunk: Suspicious DNS Traffic: https://research.splunk.com/stories/suspicious_dns_traffic/


# حفظ شواهد و گزارش قابل دفاع

## مفهوم و هدف

مشاهده را از تفسیر جدا کن: «فرمان اجرا شد» با «credential دزدیده شد» فرق دارد. برای ادعا evidence ID، source، raw و timestamp داشته باش. inconclusive معتبر است اگر خلأ و اقدام بعدی روشن باشد.

## روش بررسی

اصل را طبق سیاست با کنترل دسترسی حفظ، hash نسخه را ثبت و تبدیل‌ها را روی کپی انجام بده. hash اصالت منبع اولیه را به‌تنهایی ثابت نمی‌کند؛ custody دریافت، دسترسی و انتقال هم لازم است.

## اشتباه رایج و تمرین

خلاصه، entity، بازه UTC، known/unknown، اثر کسب‌وکار، اقدام انجام‌شده، owner و next step را بنویس. query/version و نتیجه را نگه دار تا analyst بعدی بررسی را تکرار کند. داده محرمانه واقعی در این آکادمی وارد نکن.

### آزمون

SHA-256 به‌تنهایی اصالت منبع را ثابت می‌کند؟

1. خیر؛ integrity نسخه و custody جدا هستند

2. بله

پاسخ: 1. hash تغییر نسخه را می‌سنجد نه تمام provenance را.

CISA: StopRansomware Guide: https://www.cisa.gov/stopransomware/ransomware-guide


# پاسخ هماهنگ به باج‌افزار

## مفهوم و هدف

با رمزگذاری محتمل فعال، مسیر اضطراری را فعال کن؛ برای تمام enrichmentها صبر نکن. host، سرویس حیاتی و backup درگیر را تعیین کن. isolation فقط مطابق اختیار ازپیش‌مصوب و ارزیابی اثر عملیاتی انجام شود.

## روش بررسی

قطع شبکه با خاموش‌کردن متفاوت است؛ shutdown حافظه فرار را از دست می‌دهد. CISA اشاره می‌کند وقتی قطع ارتباط ممکن نیست خاموش‌کردن ممکن است برای توقف گسترش لازم شود؛ این trade-off را IR ارزیابی می‌کند.

## اشتباه رایج و تمرین

restore از backup تست‌شده کافی نیست: مسیر ورود، credential، persistence و مدیریت backup را اصلاح کن. قبل reconnect، سلامت و monitoring را تأیید کن. گزارش‌دهی قانونی به حوزه قضایی و سیاست سازمان وابسته است.

### آزمون

برای ارجاع فعال رمزگذاری منتظر قطعیت کامل بمانیم؟

1. بله

2. نه، response و preservation را هماهنگ کن

پاسخ: 2. تأخیر می‌تواند خسارت را بیشتر کند.

CISA: StopRansomware Guide: https://www.cisa.gov/stopransomware/ransomware-guide


# ماتریس پوشش و سلامت داده

## مفهوم و هدف

برای هر behavior مشخص کن چه source/field آن را می‌بیند، چه چیزی inferred است و آخرین تست چه زمانی بوده. تعداد قانون و T-ID درصد پوشش همه حملات نیست. این پروژه inventory آموزشی است، نه کشف خودکار وضعیت سازمان.

## روش بررسی

query روی hostهای دارای لاگ، host کاملاً ساکت را نمی‌یابد مگر expected inventory را مقایسه کنی. heartbeat، last event، lag و critical null fields را پایش کن. افت alert ممکن است افت telemetry باشد.

## اشتباه رایج و تمرین

owner منبع، retention و integration version را ثبت کن. پس از parser، collection policy یا migration، تست مثبت و منفی را تکرار کن. در ماتریس این بسته وضعیت «آموزشی، اعتبارسنجی‌نشده در محیط» را با coverage واقعی اشتباه نگیر.

### آزمون

برای یافتن host بی‌لاگ چه نیاز داریم؟

1. inventory مورد انتظار علاوه بر داده موجود

2. فقط latest روی داده موجود

پاسخ: 1. موجودیت غایب ردیفی برای aggregate ندارد.

Microsoft Learn: Sysmon: https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon

Splunk: tstats reference: https://help.splunk.com/en/splunk-enterprise/search/spl-search-reference/10.2/search-commands/tstats


# تحویل شیفت و اولویت‌بندی

## مفهوم و هدف

vendor severity فقط یک ورودی است. فعال‌بودن رفتار، asset criticality، account privilege، scope و confidence را جدا ثبت کن. P1/P2 و SLA باید طبق سیاست SOC تعیین شوند؛ این بسته SLA عملیاتی تجویز نمی‌کند.

## روش بررسی

case باز، owner، آخرین اقدام/نتیجه، query قابل بازتولید، next step و زمان پیگیری را بنویس. «بررسی شد» کافی نیست؛ analyst بعدی باید بدون تکرار کار بداند کجا ادامه بدهد.

## اشتباه رایج و تمرین

برای کاهش صف، inconclusive را FP نکن. deadline تماس با مالک و تکمیل لاگ را ثبت و مسیر escalation را روشن کن. checkbox مدرک نیست؛ closing note باید دلیل و evidence link داشته باشد.

### آزمون

پرونده بی‌لاگ را برای کم‌کردن صف FP ببندیم؟

1. بله

2. نه؛ inconclusive با owner و next step

پاسخ: 2. نبود دید دلیل بی‌خطر بودن نیست.

CISA: StopRansomware Guide: https://www.cisa.gov/stopransomware/ransomware-guide


# حریم خصوصی و اعتبار منبع

## مفهوم و هدف

URL می‌تواند token یا شناسه پرونده داشته باشد. public sandbox ممکن است sample/result را منتشر کند؛ پیش از upload مجوز داده و سیاست سازمان را بررسی کن. hash-only lookup در ابزار مصوب را در نظر بگیر.

## روش بررسی

فقط داده لازم را گزارش کن؛ credential dump، secret یا session token ضمیمه عمومی نکن. redact روی نسخه کاری و با ثبت تبدیل باشد، اصل محدود طبق retention حفظ شود. سوپرادمین آکادمی یادداشت‌های تمرینی اعضا را می‌بیند.

## اشتباه رایج و تمرین

صفحه رسمی vendor مرجع است، نه مهر تأیید پروژه. تاریخ مطالعه و نوع استفاده مانند behavior context یا syntax را ثبت کن. queryها و توضیحات این نسخه تألیفی‌اند و Splunk یا Elastic آن‌ها را certify نکرده‌اند؛ نسخه نصب‌شده و تست واقعی لازم است.

### آزمون

منبع رسمی یعنی query پروژه certified است؟

1. نه، منشأ با تست اجرا فرق دارد

2. بله

پاسخ: 1. منبع معتبر جای تست محیط هدف را نمی‌گیرد.

Elastic: Remote File Download via PowerShell: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/windows/command_and_control_remote_file_copy_powershell

CISA: StopRansomware Guide: https://www.cisa.gov/stopransomware/ransomware-guide


# راهنماهای هشدار


## اجرای مشکوک PowerShell

MITRE: T1059.001 | Example severity: high

### داده لازم

Sysmon 1 و 3، Security 4688، PowerShell 4104 در صورت فعال بودن، EDR و DNS.

### ترتیب بررسی

1. raw event، زمان، میزبان، کاربر و ProcessGuid را اعتبارسنجی کن؛ parent و مسیر واقعی Image را ببین.

2. CommandLine و ScriptBlockهای مرتبط را بررسی کن. محتوای مبهم را ایمن decode کن؛ اجرا نکن.

3. فایل‌های جدید، child process و ارتباط DNS/شبکه همان پردازش را در بازه قبل و بعد جست‌وجو کن.

4. مدارک تغییر مصوب و ابزار مدیریت را با میزبان، زمان و فرمان مقایسه کن؛ دامنه را روی hash یا مقصد مشکوک گسترش بده.

### فعالیت مجاز

اسکریپت مدیریتی دقیقاً منطبق با تغییر مصوب و تأیید مالک می‌تواند فعالیت مجاز باشد؛ encoding یا امضای معتبر به‌تنهایی کافی نیست.

### ارجاع

دانلود و اجرای payload، parent غیرمنتظره، persistence، مقصد مشکوک یا نبود لاگ حیاتی را ارجاع بده.

### نقاط کور

پوشش لاگ و extraction را پیش از نتیجه‌گیری بسنج. Elastic این بخش فقط pivot اولیه است، نه معادل قانون Splunk یا detector مستقل. منبع ممکن است زمینه موضوعی بدهد، نه دقیقاً همین query.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=sysmon sourcetype="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational"
EventCode=1 earliest=-30m latest=now
(Image="*\\powershell.exe" OR Image="*\\pwsh.exe")
| table _time host User ParentImage Image CommandLine ProcessGuid
| sort 0 + _time
```

index=sysmon و sourcetype نمونه‌اند؛ نام واقعی و EventCode/EventID را تطبیق بده. این جست‌وجو همه PowerShellهای پنجره را برای triage می‌آورد، نه فقط موارد مخرب.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
process where event.type == "start" and process.name : ("powershell.exe", "pwsh.exe")
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Splunk: Malicious PowerShell: https://research.splunk.com/stories/malicious_powershell/

Elastic: Windows Script Executing PowerShell: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/windows/initial_access_script_executing_powershell


## شکست‌های ورود و ورود موفق

MITRE: T1110 | Example severity: high

### داده لازم

Windows 4625/4624، VPN یا IdP، نگاشت NAT و دارایی؛ فیلدهای حساب هدف باید اعتبارسنجی شوند.

### ترتیب بررسی

1. src، حساب هدف، dest، نوع ورود و کد علت شکست را بررسی کن. حساب سرویس را با حساب انسانی اشتباه نگیر.

2. میزان تلاش و تعداد حساب‌های هدف را نسبت به baseline بررسی کن؛ spray کم‌سرعت ممکن است threshold ساده را رد نکند.

3. برای همان موجودیت‌ها timeline خام بساز تا ترتیب شکست‌ها و موفقیت روشن شود؛ این query به‌تنهایی ترتیب را اثبات نمی‌کند.

4. پس از موفقیت، MFA، دستگاه، دسترسی به منابع و رفتار endpoint را بررسی و با کاربر مستقل تأیید کن.

### فعالیت مجاز

رمز قدیمی سرویس یا task می‌تواند علت باشد؛ تطبیق تنظیمات و تغییر رمز، مالک و نبود ورود غیرمجاز را مستند کن.

### ارجاع

موفقیت تأییدنشده پس از تلاش مشکوک، حساب ممتاز، spray گسترده یا رفتار پس از ورود مشکوک نیازمند ارجاع است.

### نقاط کور

پوشش لاگ و extraction را پیش از نتیجه‌گیری بسنج. Elastic این بخش فقط pivot اولیه است، نه معادل قانون Splunk یا detector مستقل. منبع ممکن است زمینه موضوعی بدهد، نه دقیقاً همین query.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=windows sourcetype="WinEventLog:Security"
(EventCode=4624 OR EventCode=4625) earliest=-60m latest=now
| eval user=TargetUserName, src=IpAddress, dest=Computer
| bin _time span=5m
| stats count(eval(EventCode=4625)) as failures
        count(eval(EventCode=4624)) as successes by _time src user dest
| where failures>=10
| sort - failures
```

آستانه 10 فقط آموزشی است. فیلدهای TargetUserName، IpAddress و Computer باید در Add-on محیط موجود باشند. bucket ترتیب وقوع را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
event.category:authentication and event.outcome:(failure or success)
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Splunk: Multiple Users Remotely Failed To Authenticate: https://research.splunk.com/endpoint/80f9d53e-9ca1-11eb-b0d6-acde48001122/

Elastic: Entra ID MFA Disabled: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/azure/persistence_entra_id_mfa_disabled_for_user


## DNS غیرعادی و احتمال تونل‌سازی

MITRE: T1071.004 | Example severity: medium

### داده لازم

لاگ DNS نرمال‌شده، Sysmon 22، EDR و resolver configuration.

### ترتیب بررسی

1. مشخص کن src سیستم واقعی است یا resolver؛ نوع رکورد، پاسخ و فاصله زمانی درخواست‌ها را ببین.

2. طول و تعداد queryهای یکتا را با دستگاه‌های هم‌نقش مقایسه کن؛ نام بلند به‌تنهایی tunneling نیست.

3. پردازش مولد DNS و اتصالات بعدی را در EDR یا Sysmon پیوند بده؛ registered domain را با روش معتبر استخراج کن.

4. دامنه مقصد، مالک برنامه و baseline را بررسی؛ داده حساس یا query کامل محرمانه را در سرویس عمومی آپلود نکن.

### فعالیت مجاز

CDN، ابزار پایش و telemetry ممکن است query بلند و یکتا بسازند. تأیید برنامه و الگوی مورد انتظار لازم است.

### ارجاع

پردازش نامعتبر همراه درخواست‌های منظم، دامنه تأییدنشده یا نشانه خروج داده را ارجاع بده.

### نقاط کور

پوشش لاگ و extraction را پیش از نتیجه‌گیری بسنج. Elastic این بخش فقط pivot اولیه است، نه معادل قانون Splunk یا detector مستقل. منبع ممکن است زمینه موضوعی بدهد، نه دقیقاً همین query.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=dns earliest=-60m latest=now
| eval query_length=len(query)
| bin _time span=5m
| stats count dc(query) as unique_queries avg(query_length) as avg_length
        values(record_type) as record_types by _time src
| where count>100 AND avg_length>60
| sort - avg_length
```

قرارداد: query نام DNS، src کلاینت و record_type نوع رکورد است. آستانه‌ها آموزشی‌اند و این query غربال اولیه است، نه تشخیص قطعی tunnel.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
event.category:network and dns.question.name:*
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Splunk: Suspicious DNS Traffic: https://research.splunk.com/stories/suspicious_dns_traffic/


## دسترسی مشکوک به LSASS

MITRE: T1003.001 | Example severity: high

### داده لازم

Sysmon 10 با فیلتر مناسب، EDR، رویداد ساخت فایل و process tree.

### ترتیب بررسی

1. SourceImage، TargetImage، GrantedAccess و ProcessGuidها را از raw استخراج کن.

2. امضا، مسیر، parent و کاربر پردازش مبدأ را بررسی؛ CallTrace موجود را به Tier 2 تحویل بده.

3. فایل dump، child process و شواهد ابزار diagnostic را جست‌وجو کن؛ نبود فایل dump رد قطعی credential theft نیست.

4. با تیم EDR و مالک برنامه رفتار شناخته‌شده را تطبیق بده؛ دسترسی به lsass را کلی allowlist نکن.

### فعالیت مجاز

EDR یا ابزار diagnostic مجاز می‌تواند چنین دسترسی‌ای داشته باشد؛ مسیر، نسخه، تنظیمات و زمان باید منطبق باشند.

### ارجاع

پردازش ناشناخته، artifact حافظه، کاربر غیرمنتظره یا هم‌بستگی با lateral movement را سریع ارجاع بده.

### نقاط کور

پوشش لاگ و extraction را پیش از نتیجه‌گیری بسنج. Elastic این بخش فقط pivot اولیه است، نه معادل قانون Splunk یا detector مستقل. منبع ممکن است زمینه موضوعی بدهد، نه دقیقاً همین query.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=sysmon EventCode=10 earliest=-30m latest=now
TargetImage="*\\lsass.exe"
| table _time host SourceImage TargetImage GrantedAccess SourceProcessGUID TargetProcessGUID CallTrace
| sort 0 + _time
```

Sysmon ProcessAccess باید ثبت و ایندکس شده باشد. فیلدهای GUID ممکن است در extraction محیط نام متفاوت داشته باشند.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
any where event.code == "10" and winlog.event_data.TargetImage : "*\\lsass.exe"
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Splunk: Windows Possible Credential Dumping: https://research.splunk.com/endpoint/e4723b92-7266-11ec-af45-acde48001122/

Microsoft Learn: Sysmon: https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon


## سرویس یا Scheduled Task جدید

MITRE: T1543.003 / T1053.005 | Example severity: medium

### داده لازم

Security 4697/4698، System 7045، Sysmon و لاگ مدیریت تغییر.

### ترتیب بررسی

1. نام سرویس یا task، مسیر اجرایی، آرگومان، حساب اجرا و سازنده را ثبت کن.

2. بررسی کن مسیر در Temp یا user-writable است یا مسیر مورد انتظار نرم‌افزار؛ نام آشنا کافی نیست.

3. اولین اجرا، parent نصب‌کننده، فایل اجرایی و ارتباط شبکه را به تغییر وصل کن.

4. ticket، مالک و زمان نصب را تطبیق بده؛ برای task محتوای XML را هم بررسی کن.

### فعالیت مجاز

نصب یا به‌روزرسانی معتبر با مسیر، package و change منطبق می‌تواند مجاز باشد.

### ارجاع

اجرای باینری نامعتبر با امتیاز بالا، مسیر قابل‌نوشتن توسط کاربر یا عدم تأیید مالک را ارجاع بده.

### نقاط کور

پوشش لاگ و extraction را پیش از نتیجه‌گیری بسنج. Elastic این بخش فقط pivot اولیه است، نه معادل قانون Splunk یا detector مستقل. منبع ممکن است زمینه موضوعی بدهد، نه دقیقاً همین query.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=windows earliest=-24h latest=now
(EventCode=4697 OR EventCode=4698 OR EventCode=7045)
| table _time host source EventCode SubjectUserName ServiceName ServiceFileName TaskName TaskContent
| sort 0 + _time
```

Security و System باید جمع‌آوری شوند. نام فیلدها برای رویدادهای مختلف متفاوت است؛ raw را بررسی کن.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
host.os.type:windows and event.code:("4697" or "4698" or "7045")
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Splunk: BlackSuit Ransomware: https://research.splunk.com/stories/blacksuit_ransomware/

Microsoft Learn: Sysmon: https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon


## خروج غیرمعمول داده

MITRE: T1041 | Example severity: high

### داده لازم

Firewall/proxy با bytes_out معتبر، EDR، DLP و برنامه backup.

### ترتیب بررسی

1. معنای bytes_out و جهت جریان را در vendor بررسی کن؛ bytes مجموع رفت‌وبرگشت را خروج داده فرض نکن.

2. مصرف همان دستگاه و زمان را با baseline مقایسه؛ مقصد را از نظر سرویس سازمانی و مالکیت بررسی کن.

3. پردازش، فایل‌های دسترسی‌یافته، کاربر و رویدادهای DLP را هم‌بسته کن. محتوای TLS ممکن است دیده نشود.

4. دامنه را روی کاربر و مقصد گسترش بده؛ در احتمال انتقال فعال داده حساس فوراً ارجاع بده.

### فعالیت مجاز

Backup یا sync مصوب باید با مقصد، مالک، زمان و حجم مورد انتظار تطبیق داده شود.

### ارجاع

مقصد نامعتبر، داده حساس، پردازش مشکوک یا افزایش ناگهانی بدون توضیح را ارجاع بده.

### نقاط کور

پوشش لاگ و extraction را پیش از نتیجه‌گیری بسنج. Elastic این بخش فقط pivot اولیه است، نه معادل قانون Splunk یا detector مستقل. منبع ممکن است زمینه موضوعی بدهد، نه دقیقاً همین query.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=proxy earliest=-24h latest=now
| bin _time span=1h
| stats sum(bytes_out) as sent_bytes values(user) as users by _time src dest
| eval sent_mb=round(sent_bytes/1024/1024,2)
| where sent_mb>500
| sort - sent_mb
```

src باید کلاینت و bytes_out باید ارسال از آن باشد. 500 MiB آستانه آموزشی است؛ جهت و baseline را اعتبارسنجی کن.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
event.category:network and source.bytes > 0
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

CISA: StopRansomware Guide: https://www.cisa.gov/stopransomware/ransomware-guide


## فیشینگ و کلیک کاربر

MITRE: T1566 | Example severity: high

### داده لازم

Email gateway، URL click tracking، proxy، IdP و EDR.

### ترتیب بررسی

1. Message-ID، فرستنده واقعی، Reply-To، گیرندگان و نتایج احراز دامنه را ثبت کن.

2. URL واقعی و redirectها را در محیط تحلیل مجاز بررسی کن؛ روی سیستم کاری باز نکن.

3. تحویل، کلیک، ورود اطلاعات، دانلود و اجرا مراحل جدا هستند؛ برای هر کدام مدرک مستقل بگیر.

4. گیرندگان دیگر و ورودهای مشکوک پس از کلیک را جست‌وجو کن؛ پاک‌سازی پیام یا reset فقط طبق مجوز.

### فعالیت مجاز

شبیه‌سازی فیشینگ مصوب باید با campaign ID، مالک و زمان تطبیق داشته باشد؛ pass شدن DMARC کافی نیست.

### ارجاع

ورود اعتبارنامه، consent نامعتبر، اجرای فایل یا campaign گسترده نیازمند ارجاع است.

### نقاط کور

پوشش لاگ و extraction را پیش از نتیجه‌گیری بسنج. Elastic این بخش فقط pivot اولیه است، نه معادل قانون Splunk یا detector مستقل. منبع ممکن است زمینه موضوعی بدهد، نه دقیقاً همین query.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=email earliest=-24h latest=now message_id="<MESSAGE_ID>"
| table _time message_id sender recipient subject action url
| sort 0 + _time
```

قرارداد آموزشی email: فیلد message_id را با Message-ID واقعی جایگزین کن. محتوای حساس را طبق سیاست نگهداری کن.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
email.message_id:*
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

CISA: StopRansomware Guide: https://www.cisa.gov/stopransomware/ransomware-guide


## باج‌افزار و رمزگذاری فعال

MITRE: T1486 | Example severity: high

### داده لازم

EDR، file telemetry، Windows و وضعیت سرویس و backup.

### ترتیب بررسی

1. به زمان تازه‌ترین رویداد، میزبان‌های درگیر و فعال بودن رفتار توجه کن؛ از مسیر اضطراری اطلاع بده.

2. فرآیند عامل، تغییرات گسترده فایل، ransom note و اثر روی سرویس را ثبت کن.

3. شواهد پاک شدن backup یا log و lateral movement را به Tier 2 تحویل بده؛ جست‌وجو را بی‌جهت طولانی نکن.

4. containment فقط طبق پلی‌بوک مجاز؛ زمان اقدام، مجری و نتیجه را ثبت و شواهد را حفظ کن.

### فعالیت مجاز

ابزار migration یا رمزگذاری مصوب ممکن است رفتار مشابه بسازد، اما در تهدید فعال برای گرفتن تأیید منتظر نمان.

### ارجاع

رمزگذاری محتمل فعال یا چند میزبان درگیر: ارجاع فوری طبق ماتریس شدت سازمان.

### نقاط کور

پوشش لاگ و extraction را پیش از نتیجه‌گیری بسنج. Elastic این بخش فقط pivot اولیه است، نه معادل قانون Splunk یا detector مستقل. منبع ممکن است زمینه موضوعی بدهد، نه دقیقاً همین query.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=edr earliest=-30m latest=now
(category="ransomware" OR technique_id="T1486")
| table _time dest user process_name process_id severity action file_path
| sort 0 + _time
```

category و technique_id قرارداد فرضی داده EDR هستند؛ با schema فروشنده جایگزین کن. این query برچسب EDR را بازیابی می‌کند و detector مستقل باج‌افزار نیست.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
event.kind:alert and rule.name:*ransom*
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

CISA: StopRansomware Guide: https://www.cisa.gov/stopransomware/ransomware-guide

Splunk: BlackSuit Ransomware: https://research.splunk.com/stories/blacksuit_ransomware/


## اسکریپت WSH که PowerShell اجرا می‌کند

MITRE: T1059.001 | Example severity: high

### داده لازم

Sysmon 1، 4104 فعال، EDR و فایل اسکریپت.

### ترتیب بررسی

1. parent واقعی cscript/wscript را با ProcessGuid تأیید کن؛ صرف اسم کافی نیست.

2. مسیر vbs/js و منبع دریافت از email/browser را تعیین کن؛ محتوا را اجرا نکن.

3. فرمان فرزند و 4104 را با دانلود، فایل، registry و شبکه پیوند بده.

4. همین script hash و زنجیره را روی سایر میزبان‌ها scope بگیر.

### فعالیت مجاز

logon script مصوب با hash، مسیر، مالک و زمان منطبق.

### ارجاع

اسکریپت ایمیلی همراه payload، persistence یا مقصد نامعتبر.

### نقاط کور

4104 ممکن است خاموش یا تکه‌تکه باشد؛ WSH تنها launcher نیست.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=sysmon EventCode=1 earliest=-30m latest=now
(ParentImage="*\\wscript.exe" OR ParentImage="*\\cscript.exe") (Image="*\\powershell.exe" OR Image="*\\pwsh.exe")
| table _time host User ParentImage Image CommandLine ProcessGuid ParentProcessGuid
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
process where event.type == "start" and process.parent.name : ("wscript.exe", "cscript.exe") and process.name : ("powershell.exe", "pwsh.exe")
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: Windows Script Executing PowerShell: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/windows/initial_access_script_executing_powershell

Splunk: Malicious PowerShell: https://research.splunk.com/stories/malicious_powershell/


## PowerShell و نشانه دریافت فایل

MITRE: T1105 | Example severity: high

### داده لازم

Sysmon 1/3/11/22، proxy و EDR؛ hash فایل.

### ترتیب بررسی

1. عبارت دانلود در فرمان، اثبات دریافت موفق نیست.

2. DNS، HTTP response و file creation را به همان process وصل کن.

3. مسیر، hash و امضا را ثبت کن؛ ایجاد فایل با اجرای آن فرق دارد.

4. برای child execution، task و شبکه بعدی pivot کن؛ فایل را روی سیستم کاری باز نکن.

### فعالیت مجاز

deploy مصوب با repository و hash و job منطبق.

### ارجاع

دریافت نامعتبر همراه اجرا یا persistence.

### نقاط کور

TLS محتوا را پنهان می‌کند؛ API و alias دیگر ممکن است فیلتر را رد کند.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=sysmon EventCode=1 earliest=-30m latest=now
(Image="*powershell.exe" OR Image="*pwsh.exe") (CommandLine="*DownloadString*" OR CommandLine="*Invoke-WebRequest*" OR CommandLine="*DownloadFile*")
| table _time host User ParentImage Image CommandLine ProcessGuid ParentProcessGuid
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
process where event.type == "start" and process.name : ("powershell.exe", "pwsh.exe") and process.command_line : ("*DownloadString*", "*Invoke-WebRequest*", "*DownloadFile*")
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: Remote File Download via PowerShell: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/windows/command_and_control_remote_file_copy_powershell

Splunk: Malicious PowerShell: https://research.splunk.com/stories/malicious_powershell/


## بارگذاری موتور PowerShell در پردازش دیگر

MITRE: T1059.001 | Example severity: medium

### داده لازم

Sysmon 7 فعال، EDR library، امضا و process tree.

### ترتیب بررسی

1. میزبان DLL و مسیر System.Management.Automation و زمان load را ثبت کن.

2. میزبان را با برنامه automation شناخته‌شده و package واقعی تطبیق بده.

3. شبکه، فایل و registry همان process را بررسی کن؛ DLL امضاشده میزبان را سالم نمی‌کند.

4. نسخه و hash میزبان را با مالک بررسی و سایر سیستم‌ها را scope بگیر.

### فعالیت مجاز

برنامه مدیریتی مستند با PowerShell SDK و پیکربندی منطبق.

### ارجاع

میزبان ناشناخته با ارتباط بیرونی یا تغییر امنیتی غیرمجاز.

### نقاط کور

Sysmon 7 پرحجم و اغلب فیلترشده است؛ نبود powershell.exe رد اجرای PowerShell نیست.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=sysmon earliest=-60m latest=now
EventCode=7 ImageLoaded="*System.Management.Automation*"
| table _time host Image ImageLoaded Signed Signature ProcessGuid
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
event.category:library and dll.name:("System.Management.Automation.dll" or "System.Management.Automation.ni.dll")
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: PowerShell Engine ImageLoad: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/windows/execution_suspicious_powershell_imgload

Microsoft Learn: Sysmon: https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon


## فرزند غیرعادی MSBuild

MITRE: T1127.001 | Example severity: high

### داده لازم

Sysmon 1، EDR، فایل build و لاگ CI.

### ترتیب بررسی

1. MSBuild والد و فرمان child را بازیابی کن؛ developer بودن user حکم نیست.

2. فایل پروژه را بدون اجرا با commit و job مصوب مقایسه کن.

3. خروجی build، محل compiler و شبکه را هم‌بسته کن.

4. با build agentهای هم‌نقش baseline بگیر؛ همه MSBuildها را allowlist نکن.

### فعالیت مجاز

pipeline شناخته‌شده با commit، runner و artifact منطبق.

### ارجاع

پروژه ناشناخته با executable و شبکه نامعتبر روی workstation.

### نقاط کور

csc در build عادی هم اجرا می‌شود؛ این غربال زنجیره محدود دارد.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=sysmon EventCode=1 earliest=-30m latest=now
ParentImage="*MSBuild.exe" (Image="*powershell.exe" OR Image="*csc.exe" OR Image="*cmd.exe")
| table _time host User ParentImage Image CommandLine ProcessGuid ParentProcessGuid
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
process where event.type == "start" and process.parent.name : "MSBuild.exe" and process.name : ("powershell.exe", "csc.exe", "cmd.exe")
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: MSBuild Started an Unusual Process: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/windows/defense_evasion_execution_msbuild_started_unusal_process


## ProcessAccess با CallTrace ناشناخته

MITRE: T1055 | Example severity: high

### داده لازم

Sysmon 1/10، GUID مبدأ و مقصد، EDR memory.

### ترتیب بررسی

1. UNKNOWN در raw را تأیید کن؛ غربال تک‌رویدادی اثبات تزریق نیست.

2. SourceProcessGUID و TargetProcessGUID را به رویدادهای ایجاد parent و child وصل کن.

3. فاصله زمانی، GrantedAccess و رفتار بعدی target را بررسی کن.

4. در صورت نیاز memory capture را از تیم مجاز با ثبت custody درخواست کن.

### فعالیت مجاز

debug یا monitoring مصوب با نسخه و target مشخص.

### ارجاع

هدف حساس و دسترسی ناشناخته با رفتار مشکوک بعدی.

### نقاط کور

این query برخلاف منبع sequence نمی‌سازد؛ UNKNOWN علت benign هم دارد.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=sysmon earliest=-60m latest=now
EventCode=10 CallTrace="*UNKNOWN*"
| table _time host SourceImage TargetImage SourceProcessGUID TargetProcessGUID GrantedAccess CallTrace
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
any where event.code == "10" and winlog.event_data.CallTrace : "*UNKNOWN*"
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: Suspicious Process Creation CallTrace: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/windows/defense_evasion_suspicious_process_creation_calltrace

Microsoft Learn: Sysmon: https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon


## export کردن hiveهای حساس

MITRE: T1003.002 | Example severity: high

### داده لازم

Sysmon 1/11، EDR و file access با SACL مناسب.

### ترتیب بررسی

1. مسیر reg.exe و اشاره به SAM، SYSTEM یا SECURITY را تأیید کن.

2. نتیجه فرمان و ایجاد واقعی فایل خروجی را بررسی کن.

3. archive، انتقال بعدی و استفاده از حساب در میزبان‌های دیگر را دنبال کن.

4. artifact حساس را محدود و رمزگذاری‌شده نگه دار؛ عمومی آپلود نکن.

### فعالیت مجاز

backup یا acquisition مصوب با مالک و مخزن مشخص.

### ارجاع

artifact حساس بدون مجوز یا انتقال آن.

### نقاط کور

فرمان ثبت‌شده موفقیت dump را ثابت نمی‌کند؛ raw disk پوشش جدا می‌خواهد.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=sysmon EventCode=1 earliest=-30m latest=now
Image="*reg.exe" CommandLine="*save*" (CommandLine="*SAM*" OR CommandLine="*SYSTEM*" OR CommandLine="*SECURITY*")
| table _time host User ParentImage Image CommandLine ProcessGuid ParentProcessGuid
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
process where event.type == "start" and process.name : "reg.exe" and process.args : "save" and process.command_line : ("*SAM*", "*SYSTEM*", "*SECURITY*")
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Splunk: Credential Dumping: https://research.splunk.com/stories/credential_dumping/


## فهرست credentialهای ذخیره‌شده

MITRE: T1555 | Example severity: medium

### داده لازم

Sysmon 1 یا 4688 با فرمان کامل و EDR.

### ترتیب بررسی

1. cmdkey /list را در process tree ببین؛ این فرمان password plaintext نشان نمی‌دهد.

2. user، logon session و host را با فعالیت support مقایسه کن.

3. قبل و بعد، discovery، LSASS access و remote logon را جست‌وجو کن.

4. فقط workflow دقیق تأییدشده را با expiry استثنا کن.

### فعالیت مجاز

رفع اشکال credential manager با ticket و حساب مجاز.

### ارجاع

enumeration همراه discovery یا lateral movement غیرمجاز.

### نقاط کور

cmdkey تنها ابزار password store نیست و نام آن قابل تغییر است.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=sysmon EventCode=1 earliest=-30m latest=now
Image="*cmdkey.exe" CommandLine="*/list*"
| table _time host User ParentImage Image CommandLine ProcessGuid ParentProcessGuid
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
process where event.type == "start" and process.name : "cmdkey.exe" and process.args : "/list"
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Splunk: Password Stores Query: https://research.splunk.com/endpoint/db02d6b4-5d5b-4c33-8d8f-f0577516a8c7/


## نشانه حذف Shadow Copy

MITRE: T1490 | Example severity: high

### داده لازم

Sysmon 1، VSS/backup، EDR و وضعیت واقعی backup.

### ترتیب بررسی

1. فرمان حذف، user، host و زمان را حفظ کن.

2. موفقیت و اثر را در VSS/backup تأیید کن؛ اجرای ابزار حذف موفق نیست.

3. تغییر گسترده فایل، توقف سرویس و ransom note را سریع بررسی کن.

4. در خسارت فعال با IR و مالک backup پاسخ اضطراری را هماهنگ کن.

### فعالیت مجاز

maintenance مصوب با retention و محدوده مشخص.

### ارجاع

همراهی با رمزگذاری فعال یا چند میزبان: ارجاع فوری.

### نقاط کور

فقط vssadmin/wmic غربال می‌شوند؛ APIها و ابزارهای دیگر پوشش جدا دارند.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=sysmon EventCode=1 earliest=-30m latest=now
(Image="*vssadmin.exe" OR Image="*wmic.exe") CommandLine="*delete*" CommandLine="*shadow*"
| table _time host User ParentImage Image CommandLine ProcessGuid ParentProcessGuid
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
process where event.type == "start" and process.name : ("vssadmin.exe", "wmic.exe") and process.command_line : "*delete*" and process.command_line : "*shadow*"
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Splunk: BlackSuit Ransomware: https://research.splunk.com/stories/blacksuit_ransomware/

CISA: StopRansomware Guide: https://www.cisa.gov/stopransomware/ransomware-guide


## تغییر Run و RunOnce

MITRE: T1547.001 | Example severity: medium

### داده لازم

Sysmon 12/13/30، EDR registry و logon/process.

### ترتیب بررسی

1. value، hive و داده قبل/بعد را ثبت کن؛ HKCU و HKLM scope متفاوت دارند.

2. مسیر executable، quoting و argumentها را resolve کن.

3. نویسنده را به installer و اولین اجرا بعد از logon وصل کن.

4. value data و hash مشابه را روی سایر دارایی‌ها scope بگیر.

### فعالیت مجاز

نصب مصوب با package و باینری منطبق.

### ارجاع

value ناشناخته در مسیر writable با اجرا یا شبکه بعدی.

### نقاط کور

وجود value اثبات اجرا نیست؛ startup folder در این query نیست.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=sysmon earliest=-60m latest=now
EventCode=13 (TargetObject="*CurrentVersion\\Run\\*" OR TargetObject="*CurrentVersion\\RunOnce\\*")
| table _time host Image TargetObject Details ProcessGuid
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
registry where registry.path : ("*\\CurrentVersion\\Run\\*", "*\\CurrentVersion\\RunOnce\\*")
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Splunk: BlackSuit Ransomware: https://research.splunk.com/stories/blacksuit_ransomware/

Microsoft Learn: Sysmon: https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon


## Subscription پایدار WMI

MITRE: T1546.003 | Example severity: medium

### داده لازم

Sysmon 19/20/21، WMI-Activity و EDR.

### ترتیب بررسی

1. filter، consumer و binding را جدا ثبت کن؛ یک component یک subscription کامل نیست.

2. query محرک و فرمان consumer را بدون اجرا بررسی کن.

3. سازنده، namespace و زمان را با ابزار مدیریت مقایسه کن.

4. اجرای واقعی consumer و binding مشابه روی سایر سیستم‌ها را دنبال کن.

### فعالیت مجاز

subscription مستند ابزار مدیریت با تنظیم منطبق.

### ارجاع

consumer ناشناخته با اسکریپت یا شبکه نامعتبر.

### نقاط کور

19 تا 21 ایجاد ساختار را نشان می‌دهند، نه هر بار اجرای consumer.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=sysmon earliest=-60m latest=now
(EventCode=19 OR EventCode=20 OR EventCode=21)
| table _time host EventCode User Operation EventNamespace Name Query Consumer Filter Destination
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
host.os.type:windows and event.code:("19" or "20" or "21") and winlog.provider_name:"Microsoft-Windows-Sysmon"
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Microsoft Learn: Sysmon: https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon


## پاک‌شدن لاگ Windows

MITRE: T1070.001 | Example severity: high

### داده لازم

Security 1102، System 104، 4688 و سلامت collector.

### ترتیب بررسی

1. provider و channel را تأیید کن؛ Event ID بدون provider کافی نیست.

2. account و SubjectLogonId را به نشست و فرمان شروع‌کننده وصل کن.

3. آخرین event قبل و اولین بعد و EDR مستقل را حفظ کن.

4. شکاف زمانی و میزبان‌های هم‌زمان را به IR و logging تحویل بده.

### فعالیت مجاز

پاک‌سازی مصوب با retention جایگزین و owner تأییدشده.

### ارجاع

پاک‌سازی بی‌مجوز یا پس از credential/privilege activity.

### نقاط کور

rotation یا forwarding failure لزوماً 1102 نمی‌دهد؛ health alert جدا لازم است.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=windows earliest=-24h latest=now
(EventCode=1102 OR EventCode=104)
| table _time host EventCode source Provider_Name SubjectUserName SubjectLogonId
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
host.os.type:windows and ((event.code:"1102" and winlog.channel:"Security") or (event.code:"104" and winlog.provider_name:"Microsoft-Windows-Eventlog"))
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

CISA: StopRansomware Guide: https://www.cisa.gov/stopransomware/ransomware-guide

Microsoft Learn: Sysmon: https://learn.microsoft.com/en-us/sysinternals/downloads/sysmon


## سرویس جدید با احتمال اجرای راه دور

MITRE: T1569.002 | Example severity: high

### داده لازم

7045، 4697، 4624، 5145، SMB و EDR.

### ترتیب بررسی

1. سرویس، مسیر باینری و حساب اجرا را روی مقصد ثبت کن.

2. با type-3 logon و share access مبدأ را بررسی کن؛ هم‌زمانی علیت نیست.

3. فایل ایجادشده و اجرای سرویس را به GUID و hash پیوند بده.

4. با RMM، ticket و rollout تطبیق بده و همان حساب/باینری را scope بگیر.

### فعالیت مجاز

deploy agent مصوب با باینری و پنجره تغییر منطبق.

### ارجاع

سرویس ناشناخته همراه remote logon و اجرای privileged بی‌مجوز.

### نقاط کور

7045 مبدأ remote را ثابت نمی‌کند؛ نصب local همین event را دارد.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=windows earliest=-24h latest=now
(EventCode=7045 OR EventCode=4697)
| table _time host EventCode ServiceName ServiceFileName ServiceAccount SubjectUserName
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
host.os.type:windows and event.code:("7045" or "4697")
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Splunk: BlackSuit Ransomware: https://research.splunk.com/stories/blacksuit_ransomware/


## ایجاد یا تغییر Cron

MITRE: T1053.003 | Example severity: medium

### داده لازم

FIM/EDR file، auditd EXECVE، journal/auth و تنظیم قبل/بعد. SPL قرارداد فرضی event_category، file_path، action، process_name دارد؛ این‌ها نام خام auditd نیستند.

### ترتیب بررسی

1. فایل، owner و diff نسبت به نسخه قبلی را ثبت کن.

2. schedule، کاربر اجرا و مسیر/آرگومان را در context cron بخوان.

3. نویسنده و اولین اجرای job را به process/journal وصل کن.

4. فرمان، URL یا hash مشابه را روی سرورهای دیگر بررسی کن.

### فعالیت مجاز

package upgrade یا job عملیاتی با change و owner منطبق.

### ارجاع

job ناشناخته شبکه‌ای با root یا payload نامعتبر.

### نقاط کور

FIM ممکن است writer نداشته باشد؛ مسیر spool توزیع‌ها متفاوت است.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=linux event_category=file earliest=-24h latest=now
(file_path="/etc/cron*" OR file_path="/var/spool/cron/*" OR file_path="/var/spool/anacron/*")
| table _time host user file_path action process_name process_id
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
file where host.os.type == "linux" and event.type != "deletion" and file.path : ("/etc/cron*", "/var/spool/cron/*", "/var/spool/anacron/*")
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: Cron Job Created or Modified: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/linux/persistence_cron_job_creation


## سرویس systemd جدید

MITRE: T1543.002 | Example severity: medium

### داده لازم

FIM/EDR file، auditd EXECVE، journal/auth و تنظیم قبل/بعد. SPL قرارداد فرضی event_category، file_path، action، process_name دارد؛ این‌ها نام خام auditd نیستند.

### ترتیب بررسی

1. unit، drop-in، owner و source package را حفظ کن.

2. ExecStart، User، EnvironmentFile و symlinkهای enablement را بخوان.

3. با journal اجرای واقعی را از صرف ایجاد فایل جدا کن.

4. user/system unit و میزبان‌های با unit مشابه را بررسی کن.

### فعالیت مجاز

package مصوب با unit و binary منطبق.

### ارجاع

unit ناشناخته با root یا executable در مسیر writable.

### نقاط کور

unit ممکن است فعال نباشد؛ drop-in رفتار unit قدیمی را عوض می‌کند.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=linux event_category=file earliest=-24h latest=now
file_path="*.service" (file_path="/etc/systemd/*" OR file_path="/usr/lib/systemd/*" OR file_path="/lib/systemd/*" OR file_path="/home/*/.config/systemd/*" OR file_path="/root/.config/systemd/*")
| table _time host user file_path action process_name process_id
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
file where host.os.type == "linux" and file.extension == "service" and file.path : ("/etc/systemd/*", "/usr/lib/systemd/*", "/lib/systemd/*", "/home/*/.config/systemd/*", "/root/.config/systemd/*")
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: Systemd Service Created: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/linux/persistence_systemd_service_creation


## Timer جدید systemd

MITRE: T1053.006 | Example severity: medium

### داده لازم

FIM/EDR file، auditd EXECVE، journal/auth و تنظیم قبل/بعد. SPL قرارداد فرضی event_category، file_path، action، process_name دارد؛ این‌ها نام خام auditd نیستند.

### ترتیب بررسی

1. timer و unit فعال‌شونده را مشخص کن؛ timer خودش payload نیست.

2. OnCalendar، OnBootSec، Persistent و enablement را ثبت کن.

3. service مربوط و ExecStart را با job مصوب تطبیق بده.

4. last/next trigger و اجرای واقعی را از journal بررسی کن.

### فعالیت مجاز

backup/update با service و owner مصوب.

### ارجاع

timer متصل به فرمان ناشناخته یا شبکه نامعتبر.

### نقاط کور

فیلتر فقط پسوند، فایل‌های خارج baseline را هم می‌گیرد؛ scope را تطبیق بده.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=linux event_category=file earliest=-24h latest=now
file_path="*.timer"
| table _time host user file_path action process_name process_id
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
file where host.os.type == "linux" and file.extension == "timer"
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: Systemd Timer Created: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/linux/persistence_systemd_scheduled_timer_created


## تغییر authorized_keys

MITRE: T1098.004 | Example severity: high

### داده لازم

FIM/EDR file، auditd EXECVE، journal/auth و تنظیم قبل/بعد. SPL قرارداد فرضی event_category، file_path، action، process_name دارد؛ این‌ها نام خام auditd نیستند.

### ترتیب بررسی

1. فایل، user هدف، fingerprint کلید عمومی و diff را ثبت کن؛ private key نگیر.

2. نویسنده و automation را با change مصوب پیوند بده.

3. ورود بعدی SSH را با fingerprint و IP مقایسه کن؛ IP مشترک هویت نیست.

4. همان کلید عمومی و دسترسی root را در سایر میزبان‌ها بررسی کن.

### فعالیت مجاز

rotation با inventory و مالک و ticket تأییدشده.

### ارجاع

کلید ناشناخته root یا استفاده از source نامعتبر.

### نقاط کور

AuthorizedKeysCommand و مسیرهای سفارشی ممکن است از این فیلتر بیرون باشند.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=linux event_category=file earliest=-24h latest=now
(file_path="*/.ssh/authorized_keys" OR file_path="*/.ssh/authorized_keys2")
| table _time host user file_path action process_name process_id
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
file where host.os.type == "linux" and file.path : ("*/.ssh/authorized_keys", "*/.ssh/authorized_keys2")
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: Persistence via File Modification: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/fim/persistence_suspicious_file_modifications


## تغییر sudoers و افزایش اختیار

MITRE: T1548.003 | Example severity: high

### داده لازم

FIM/EDR file، auditd EXECVE، journal/auth و تنظیم قبل/بعد. SPL قرارداد فرضی event_category، file_path، action، process_name دارد؛ این‌ها نام خام auditd نیستند.

### ترتیب بررسی

1. diff sudoers و includeها را حفظ کن؛ timestamp کافی نیست.

2. user/group، NOPASSWD، wildcard و effective policy را بررسی کن.

3. نویسنده و sudo بعدی را با audit UID و نشست مرتبط کن.

4. گروه‌های متأثر و دیگر hostهای configuration management را scope بگیر.

### فعالیت مجاز

اختیار محدود با review و job مصوب؛ صرف Ansible بودن کافی نیست.

### ارجاع

ALL/NOPASSWD غیرمجاز یا اجرای root پس از آن.

### نقاط کور

config نامعتبر ممکن است مؤثر نشده باشد؛ LDAP/SSSD هم policy می‌دهند.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=linux event_category=file earliest=-24h latest=now
(file_path="/etc/sudoers" OR file_path="/etc/sudoers.d/*")
| table _time host user file_path action process_name process_id
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
file where host.os.type == "linux" and file.path : ("/etc/sudoers", "/etc/sudoers.d/*")
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: Persistence via File Modification: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/fim/persistence_suspicious_file_modifications


## تغییر shell profile

MITRE: T1546.004 | Example severity: medium

### داده لازم

FIM/EDR file، auditd EXECVE، journal/auth و تنظیم قبل/بعد. SPL قرارداد فرضی event_category، file_path، action، process_name دارد؛ این‌ها نام خام auditd نیستند.

### ترتیب بررسی

1. فایل profile و shell کاربر را تعیین کن؛ shellها فایل یکسان نمی‌خوانند.

2. diff را برای startup command، alias و PATH بررسی کن.

3. نویسنده، login بعدی و child/network را پیوند بده.

4. مسیر و hash مرجع را scope و پیش از اصلاح شواهد را حفظ کن.

### فعالیت مجاز

dotfile مصوب با repository و owner منطبق.

### ارجاع

اجرای پنهان یا شبکه در startup بدون مجوز.

### نقاط کور

login و non-interactive shell متفاوت‌اند؛ تغییر فایل اثبات اجرا نیست.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=linux event_category=file earliest=-24h latest=now
(file_path="/etc/profile" OR file_path="/etc/profile.d/*" OR file_path="*/.bashrc" OR file_path="*/.zshrc" OR file_path="*/.profile")
| table _time host user file_path action process_name process_id
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
file where host.os.type == "linux" and file.path : ("/etc/profile", "/etc/profile.d/*", "*/.bashrc", "*/.zshrc", "*/.profile")
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: Persistence via File Modification: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/fim/persistence_suspicious_file_modifications


## غیرفعال‌شدن MFA کاربر Entra

MITRE: T1556.006 | Example severity: high

### داده لازم

Entra audit/sign-in، actor، targetResources و Conditional Access. SPL فرض می‌کند operation_name/result استخراج شده‌اند.

### ترتیب بررسی

1. عملیات موفق و user هدف را از raw ثبت کن؛ actor لزوماً target نیست.

2. روش حذف‌شده و MFA مؤثر و Conditional Access را بررسی کن.

3. sign-in، consent و role change قبل/بعد را برای هر دو هویت بررسی کن.

4. با IAM مستقلاً change را تأیید کن؛ restore/revoke فقط با مجوز.

### فعالیت مجاز

بازیابی عامل با ticket و احراز هویت مستقل و کنترل جبرانی.

### ارجاع

user ممتاز یا تغییر تأییدنشده همراه sign-in/mailbox activity.

### نقاط کور

حذف یک روش لزوماً حذف همه MFA نیست؛ حذف از Conditional Access پوشش جدا می‌خواهد.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=azure earliest=-24h latest=now
(operation_name="Disable Strong Authentication" OR operation_name="User deleted security info")
| table _time operation_name result initiatedBy targetResources correlationId
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
data_stream.dataset:"azure.auditlogs" and azure.auditlogs.operation_name:("Disable Strong Authentication" or "User deleted security info") and event.outcome:("Success" or "success")
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: Entra ID MFA Disabled: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/azure/persistence_entra_id_mfa_disabled_for_user


## Forwarding مشکوک ایمیل

MITRE: T1114.003 | Example severity: high

### داده لازم

M365 audit، rule parameters، message trace و Entra sign-in؛ SPL فیلدهای raw استخراج‌شده را فرض می‌کند.

### ترتیب بررسی

1. rule ID و ForwardTo/RedirectTo را از raw کامل بگیر؛ query فقط تغییر را غربال می‌کند.

2. آدرس را parse و دامنه دقیق را با inventory تطبیق بده؛ suffix ساده کافی نیست.

3. message trace را برای ارسال واقعی و scope پیام‌ها بررسی کن.

4. نشست actor، MFA و ruleهای دیگر را بررسی کن.

### فعالیت مجاز

workflow مصوب با مقصد و شرایط محدود و owner تأییدشده.

### ارجاع

مقصد خارجی بی‌مجوز یا شواهد خروج داده حساس.

### نقاط کور

audit ساخت rule حجم خروج نمی‌دهد؛ mailbox forwarding مستقل هم وجود دارد.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=o365 earliest=-24h latest=now
(Operation="New-InboxRule" OR Operation="Set-InboxRule" OR Operation="Set-Mailbox")
| table _time UserId ClientIP Operation ObjectId Parameters
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
data_stream.dataset:"o365.audit" and event.provider:"Exchange" and event.action:("New-InboxRule" or "Set-InboxRule" or "Set-Mailbox") and event.outcome:"success"
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: M365 Inbox Forwarding Rule: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/o365/collection_exchange_new_inbox_rule


## واگذاری پرخطر دسترسی mailbox

MITRE: T1098.002 | Example severity: high

### داده لازم

M365 audit، ACL، Entra و access/send logs فعال؛ SPL فیلدهای raw استخراج‌شده.

### ترتیب بررسی

1. mailbox، grantee و actor اعطا را سه موجودیت جدا ثبت کن.

2. FullAccess، SendAs و SendOnBehalf را با action/parameter درست تشخیص بده.

3. ارسال، دسترسی و ruleهای بعدی grantee را بررسی کن.

4. expiry و رابطه سازمانی و approval را با mailbox owner تأیید کن.

### فعالیت مجاز

دستیار یا shared mailbox با سطح و مدت مصوب.

### ارجاع

delegation بی‌مجوز به mailbox حساس یا استفاده غیرمنتظره.

### نقاط کور

Add-MailboxPermission همه حق‌ها را پوشش نمی‌دهد؛ SendAs عمل دیگری است.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=o365 earliest=-24h latest=now
(Operation="Add-MailboxPermission" OR Operation="Add-RecipientPermission" OR Operation="Set-Mailbox")
| table _time UserId Operation ObjectId Parameters ClientIP
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
data_stream.dataset:"o365.audit" and event.provider:"Exchange" and event.outcome:"success" and ((event.action:"Add-MailboxPermission" and o365.audit.Parameters.AccessRights:"FullAccess") or (event.action:"Add-RecipientPermission" and o365.audit.Parameters.AccessRights:"SendAs") or (event.action:"Set-Mailbox" and o365.audit.Parameters.GrantSendOnBehalfTo:*))
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: M365 High-Risk Permission Delegated: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/o365/persistence_exchange_suspicious_mailbox_permission_delegation


## Transport rule جدید در M365

MITRE: T1114.003 | Example severity: high

### داده لازم

Exchange admin audit، تنظیم کامل rule و message trace؛ فیلدهای raw استخراج‌شده در SPL.

### ترتیب بررسی

1. actor و موفقیت ایجاد rule را ثبت کن؛ ساخت rule الزاماً forwarding نیست.

2. action، priority، condition و exception را از تنظیم کامل بخوان.

3. اثر سازمانی و مقصدهای خارجی را بررسی کن.

4. message trace و تغییر mail security هم‌زمان را به تیم messaging بده.

### فعالیت مجاز

routing یا disclaimer/compliance مصوب با scope مشخص.

### ارجاع

rule مخفی‌کننده یا خارج‌کننده ایمیل بی‌مجوز با اثر گسترده.

### نقاط کور

query فقط create است؛ modification/disable/delete پوشش جدا دارند.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=o365 earliest=-24h latest=now Operation="New-TransportRule"
| table _time UserId ClientIP Operation ObjectId Parameters
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
data_stream.dataset:"o365.audit" and event.provider:"Exchange" and event.action:"New-TransportRule" and event.outcome:"success"
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: M365 Transport Rule Created: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/o365/exfiltration_exchange_transport_rule_creation


## توقف لاگ CloudTrail

MITRE: T1562.008 | Example severity: high

### داده لازم

CloudTrail management events، raw requestParameters، actor ARN، account، region و تنظیم فعلی. SPL فیلدهای JSON استخراج‌شده را فرض می‌کند؛ deniedها هم نمایش داده می‌شوند.

### ترتیب بررسی

1. actor ARN، session issuer، IP و trail هدف را تعیین کن.

2. API success و IsLogging فعلی را جدا بررسی کن.

3. multi-region/organization، trail جایگزین و مدت شکاف را ثبت کن.

4. IAM/S3/KMS اطراف رویداد را بررسی و restore را با مالک هماهنگ کن.

### فعالیت مجاز

maintenance با trail جایگزین سالم و change ثبت‌شده.

### ارجاع

توقف بی‌مجوز یا همراه تغییر اختیار/داده حساس.

### نقاط کور

توقف یک trail همه AWS logs یا Event History را الزاماً قطع نمی‌کند؛ delivery تأخیر دارد.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=aws sourcetype="aws:cloudtrail" earliest=-24h latest=now
eventSource="cloudtrail.amazonaws.com" eventName IN ("StopLogging")
| table _time eventName userIdentity.arn sourceIPAddress recipientAccountId awsRegion errorCode requestParameters
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
data_stream.dataset:"aws.cloudtrail" and event.provider:"cloudtrail.amazonaws.com" and event.action:("StopLogging") and event.outcome:"success"
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: AWS CloudTrail Log Suspended: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/aws/defense_evasion_cloudtrail_logging_suspended


## حذف trail در CloudTrail

MITRE: T1562.008 | Example severity: high

### داده لازم

CloudTrail management events، raw requestParameters، actor ARN، account، region و تنظیم فعلی. SPL فیلدهای JSON استخراج‌شده را فرض می‌کند؛ deniedها هم نمایش داده می‌شوند.

### ترتیب بررسی

1. ARN، actor و errorCode را حفظ کن.

2. تعیین کن trail سازمانی یا تنها پوشش account بوده یا نه.

3. لاگ‌های تاریخی S3/CloudWatch و retention را حفظ و بررسی کن.

4. StopLogging قبلی و تغییر IAM بعدی را scope بگیر.

### فعالیت مجاز

decommission مصوب با trail جایگزین تأییدشده.

### ارجاع

حذف پوشش اصلی بدون جایگزین یا principal نامعتبر.

### نقاط کور

حذف trail به‌خودی‌خود لاگ تاریخی ذخیره‌شده را حذف نمی‌کند.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=aws sourcetype="aws:cloudtrail" earliest=-24h latest=now
eventSource="cloudtrail.amazonaws.com" eventName IN ("DeleteTrail")
| table _time eventName userIdentity.arn sourceIPAddress recipientAccountId awsRegion errorCode requestParameters
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
data_stream.dataset:"aws.cloudtrail" and event.provider:"cloudtrail.amazonaws.com" and event.action:("DeleteTrail") and event.outcome:"success"
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: AWS CloudTrail Log Deleted: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/aws/defense_evasion_cloudtrail_logging_deleted


## تغییر تنظیمات CloudTrail

MITRE: T1562.008 | Example severity: high

### داده لازم

CloudTrail management events، raw requestParameters، actor ARN، account، region و تنظیم فعلی. SPL فیلدهای JSON استخراج‌شده را فرض می‌کند؛ deniedها هم نمایش داده می‌شوند.

### ترتیب بررسی

1. تنظیم پیش و پس و actor را ثبت کن.

2. S3BucketName، KmsKeyId، multi-region و global events را بررسی کن.

3. مالکیت مقصد و قابلیت decrypt برای collector را تأیید کن.

4. مدت افت پوشش و تغییرات هم‌زمان principal را ثبت کن.

### فعالیت مجاز

migration مصوب با تحویل لاگ موفق به مقصد مجاز.

### ارجاع

مقصد بیرون سازمان یا کاهش دید بی‌مجوز.

### نقاط کور

UpdateTrail تغییر event selector را پوشش نمی‌دهد.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=aws sourcetype="aws:cloudtrail" earliest=-24h latest=now
eventSource="cloudtrail.amazonaws.com" eventName IN ("UpdateTrail")
| table _time eventName userIdentity.arn sourceIPAddress recipientAccountId awsRegion errorCode requestParameters
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
data_stream.dataset:"aws.cloudtrail" and event.provider:"cloudtrail.amazonaws.com" and event.action:("UpdateTrail") and event.outcome:"success"
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: AWS CloudTrail Log Updated: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/aws/impact_cloudtrail_logging_updated


## تغییر Event Selectors در CloudTrail

MITRE: T1562.008 | Example severity: high

### داده لازم

CloudTrail management events، raw requestParameters، actor ARN، account، region و تنظیم فعلی. SPL فیلدهای JSON استخراج‌شده را فرض می‌کند؛ deniedها هم نمایش داده می‌شوند.

### ترتیب بررسی

1. موفقیت و JSON کامل درخواست را بازیابی کن.

2. همه selectorها را ساختاری بررسی کن؛ یک false در رشته کافی نیست.

3. includeManagementEvents و advanced selector را با baseline تطبیق بده.

4. با event مستقل تداوم ingestion و شکاف management/data را بسنج.

### فعالیت مجاز

کاهش هزینه مصوب با پوشش جایگزین reviewشده.

### ارجاع

حذف پوشش حساس بدون کنترل جبرانی.

### نقاط کور

query تمام selector changeها را می‌آورد؛ فقط raw review افت پوشش را تعیین می‌کند.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=aws sourcetype="aws:cloudtrail" earliest=-24h latest=now
eventSource="cloudtrail.amazonaws.com" eventName IN ("PutEventSelectors")
| table _time eventName userIdentity.arn sourceIPAddress recipientAccountId awsRegion errorCode requestParameters
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
data_stream.dataset:"aws.cloudtrail" and event.provider:"cloudtrail.amazonaws.com" and event.action:("PutEventSelectors") and event.outcome:"success"
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: CloudTrail Management Events Disabled: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/aws/defense_evasion_cloudtrail_management_events_disabled_via_eventselectors


## توقف AWS Config Recorder

MITRE: T1562.008 | Example severity: high

### داده لازم

CloudTrail management events، raw requestParameters، actor ARN، account، region و تنظیم فعلی. SPL فیلدهای JSON استخراج‌شده را فرض می‌کند؛ deniedها هم نمایش داده می‌شوند.

### ترتیب بررسی

1. principal، recorder و region را ثبت کن.

2. وضعیت recorder و آخرین configuration item را بررسی کن.

3. تغییر IAM، شبکه و منابع در شکاف را با CloudTrail بررسی کن.

4. وابستگی compliance و alerting را تعیین و restart را هماهنگ کن.

### فعالیت مجاز

provisioning/teardown مصوب با account و زمان مشخص.

### ارجاع

توقف تولیدی بی‌مجوز یا همراه تغییرات حساس.

### نقاط کور

Config تاریخچه تنظیمات است، نه جایگزین تمام API logهای CloudTrail.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=aws sourcetype="aws:cloudtrail" earliest=-24h latest=now
eventSource="config.amazonaws.com" eventName IN ("StopConfigurationRecorder")
| table _time eventName userIdentity.arn sourceIPAddress recipientAccountId awsRegion errorCode requestParameters
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
data_stream.dataset:"aws.cloudtrail" and event.provider:"config.amazonaws.com" and event.action:("StopConfigurationRecorder") and event.outcome:"success"
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: AWS Config Recorder Stopped: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/aws/defense_evasion_configuration_recorder_stopped


## تغییر Server Access Logging در S3

MITRE: T1562.008 | Example severity: high

### داده لازم

CloudTrail management events، raw requestParameters، actor ARN، account، region و تنظیم فعلی. SPL فیلدهای JSON استخراج‌شده را فرض می‌کند؛ deniedها هم نمایش داده می‌شوند.

### ترتیب بررسی

1. bucket هدف، account و principal را از raw ثبت کن.

2. LoggingEnabled و TargetBucket/Prefix را ساختاری با تنظیم فعلی مقایسه کن.

3. برای bucket حساس، object access موجود و policy changeها را بررسی کن.

4. پس از اصلاح مجاز، دریافت لاگ در مقصد و شکاف را تأیید کن.

### فعالیت مجاز

migration مقصد با دریافت آزمایش‌شده و retention مصوب.

### ارجاع

خاموشی یا مقصد نامعتبر روی bucket حساس/لاگ.

### نقاط کور

PutBucketLogging می‌تواند logging را فعال کند؛ query خودش disable را اثبات نمی‌کند. data events نیازمند پیکربندی هستند.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=aws sourcetype="aws:cloudtrail" earliest=-24h latest=now
eventSource="s3.amazonaws.com" eventName IN ("PutBucketLogging")
| table _time eventName userIdentity.arn sourceIPAddress recipientAccountId awsRegion errorCode requestParameters
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
data_stream.dataset:"aws.cloudtrail" and event.provider:"s3.amazonaws.com" and event.action:("PutBucketLogging") and event.outcome:"success"
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: S3 Server Access Logging Disabled: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/aws/defense_evasion_s3_bucket_server_access_logging_disabled


## تغییر لاگ invocation در Bedrock

MITRE: T1562.008 | Example severity: high

### داده لازم

CloudTrail management events، raw requestParameters، actor ARN، account، region و تنظیم فعلی. SPL فیلدهای JSON استخراج‌شده را فرض می‌کند؛ deniedها هم نمایش داده می‌شوند.

### ترتیب بررسی

1. delete یا put و actor را جدا ثبت کن.

2. S3/CloudWatch مقصد و مالک آن را بررسی کن.

3. تداوم دریافت invocation log را با تیم AI platform بسنج.

4. دسترسی احتمالی به prompt/response حساس و IAM اطراف رویداد را بررسی کن.

### فعالیت مجاز

تغییر مقصد/retention مصوب با review حریم خصوصی و دسترسی.

### ارجاع

ارسال لاگ حساس به مقصد بی‌مجوز یا توقف بدون کنترل جبرانی.

### نقاط کور

این alert درباره logging است، نه detector عمومی prompt injection یا اثبات نشت.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=aws sourcetype="aws:cloudtrail" earliest=-24h latest=now
eventSource="bedrock.amazonaws.com" eventName IN ("DeleteModelInvocationLoggingConfiguration", "PutModelInvocationLoggingConfiguration")
| table _time eventName userIdentity.arn sourceIPAddress recipientAccountId awsRegion errorCode requestParameters
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
data_stream.dataset:"aws.cloudtrail" and event.provider:"bedrock.amazonaws.com" and event.action:("DeleteModelInvocationLoggingConfiguration" OR "PutModelInvocationLoggingConfiguration") and event.outcome:"success"
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Elastic: Bedrock Invocation Logging Changed: https://www.elastic.co/docs/reference/security/prebuilt-rules/rules/integrations/aws/defense_evasion_bedrock_model_invocation_logging_disabled_or_modified


## ارتباط شبکه با تناوب غیرعادی

MITRE: T1071.001 | Example severity: medium

### داده لازم

proxy/flow نرمال‌شده با src، dest، dest_port و زمان دقیق؛ DNS و EDR.

### ترتیب بررسی

1. duplicateهای collector و session طولانی را پیش از تفسیر gap جدا کن.

2. تناوب src/dest/port را با نمونه کافی و baseline برنامه مقایسه کن.

3. process مبدأ، DNS و TLS metadata را بررسی کن؛ fingerprint هویت قطعی نیست.

4. با process hash و مقصد scope بگیر و jitter را لحاظ کن.

### فعالیت مجاز

healthcheck یا agent با endpoint و timing مصوب.

### ارجاع

تناوب با process ناشناخته و credential activity یا مقصد جدید.

### نقاط کور

threshold آموزشی است؛ jitter/sampling می‌تواند detector را رد کند. KQL فقط pivot است، نه محاسبه تناوب.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=proxy earliest=-60m latest=now
| sort 0 src dest dest_port _time
| streamstats current=f last(_time) as previous by src dest dest_port
| eval gap=_time-previous
| where gap>0
| stats count as gaps avg(gap) as mean_gap stdev(gap) as sd by src dest dest_port
| where gaps>=10 AND mean_gap>0
| eval cv=sd/mean_gap
| where cv<0.15
| sort cv
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
event.category:network and source.ip:* and destination.ip:* and destination.port:*
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Splunk: Cobalt Strike: https://research.splunk.com/stories/cobalt_strike/


## اسکن پورت یا سرویس

MITRE: T1046 | Example severity: medium

### داده لازم

Firewall/flow، src/dest/dest_port/action، NAT و inventory scanner.

### ترتیب بررسی

1. src واقعی پشت NAT را تعیین و allow/deny را جدا بررسی کن.

2. تعداد dest/port یکتا را در bucket و timeline خام بررسی کن.

3. با scanner، job ID و maintenance مصوب تطبیق بده.

4. روی source، discovery و سپس logon/service execution را جست‌وجو کن.

### فعالیت مجاز

vulnerability scan با IP، برنامه و job منطبق.

### ارجاع

workstation غیرمنتظره یا اسکن همراه lateral movement.

### نقاط کور

اسکن کم‌سرعت و bucket boundary می‌تواند از دست برود؛ volume تنها حکم نیست. KQL آستانه نمی‌سازد.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=firewall earliest=-60m latest=now
| bin _time span=5m
| stats dc(dest) as hosts dc(dest_port) as ports count values(action) as actions by _time src
| where hosts>=20 OR ports>=20
| sort - count
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic KQL (pivot، نه معادل قطعی)

```kql
event.category:network and source.ip:* and destination.port:*
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Splunk: Citrix ADC CVE-2023-3519: https://research.splunk.com/stories/citrix_netscaler_adc_cve-2023-3519/


## وب‌سرور که shell اجرا می‌کند

MITRE: T1505.003 | Example severity: high

### داده لازم

EDR/Sysmon process، web access، WAF، upload و file telemetry.

### ترتیب بررسی

1. parent وب‌سرور و child را با app pool و حساب سرویس پیوند بده.

2. HTTP request، request ID و فایل تازه webroot را پیرامون زمان بررسی کن.

3. فرمان، credential access و شبکه خروجی child را دنبال کن.

4. nodeهای دیگر برنامه را scope بگیر؛ patch به‌تنهایی persistence موجود را حذف نمی‌کند.

### فعالیت مجاز

job مصوب برنامه با مسیر ثابت و deployment منطبق.

### ارجاع

فرمان ناشناخته ناشی از request یا upload مشکوک و secret access.

### نقاط کور

webshell می‌تواند بدون child کار کند؛ SPL این نمونه فقط Windows است.

### SPL (تألیفی، تست‌نشده در SIEM)

```spl
index=sysmon EventCode=1 earliest=-30m latest=now
(ParentImage="*w3wp.exe" OR ParentImage="*nginx.exe" OR ParentImage="*httpd.exe") (Image="*cmd.exe" OR Image="*powershell.exe" OR Image="*pwsh.exe")
| table _time host User ParentImage Image CommandLine ProcessGuid ParentProcessGuid
| sort 0 + _time
```

SPL تألیفی برای triage است، نه قانون آماده نصب. index، sourcetype و extraction را تطبیق بده؛ برای پرونده بازه مطلق UTC ثبت کن. نبود نتیجه، نبود حمله را ثابت نمی‌کند.

### Elastic EQL (pivot، نه معادل قطعی)

```eql
process where event.type == "start" and process.parent.name : ("w3wp.exe", "nginx", "nginx.exe", "httpd", "php-fpm") and process.name : ("cmd.exe", "powershell.exe", "pwsh.exe", "sh", "bash")
```

زمان، data view و mapping باید در محیط تنظیم شوند. KQL فقط فیلتر است.

### منابع

Splunk: WebServer Suspicious Child Process: https://research.splunk.com/endpoint/2d4470ef-7158-4b47-b68b-1f7f16382156/