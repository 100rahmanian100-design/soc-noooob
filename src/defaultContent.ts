/** محتوای پیش‌فرض — دقیقاً معادل همین محتوای فعلی GuidePage */
import type { SiteContent } from './contentTypes';

export const DEFAULT_CONTENT: SiteContent = {
  menus: {
    home: 'میز کار',
    'phase-1': 'فاز ۱: آموزش SIEM',
    'phase-2': 'فاز ۲: آموزش شبکه',
    'phase-3': 'فاز ۳: آموزش Endpoint',
    'phase-4': 'فاز ۴: Onboarding',
    appendix: 'پیوست ۱: مراجع SANS SEC450',
  },
  pages: {
    home: {
      headerTitle: 'میز کار',
      headerKicker: 'DASHBOARD',
      headerEmoji: '🏠',
      blocks: [
        {
          id: 'home-intro',
          type: 'paragraph',
          text: 'خلاصه دوره آزمایشی و وضعیت کلی پیشرفت شما. با ثبت وضعیت منابع هر فاز، نوار پیشرفت به‌صورت زنده به‌روزرسانی می‌شود.',
        },
        {
          id: 'home-proposal',
          type: 'bullets',
          items: [
            'اکانت فعال در ماشین‌های Elastic و Splunk آزمایشگاه MSSP (برای تمرین)',
            'دسترسی پروژه‌های واقعی Elastic و Splunk (ارسال توسط کارشناس لایه ۳)',
            'جلسات ارزیابی نظری و عملی پایان هر فاز با کارشناس لایه ۳',
            'ورود منظم و ثبت پیشرفت در هر فاز تا پایان مهرماه',
          ],
        },
      ],
    },
    'phase-1': {
      headerTitle: 'آموزش SIEM',
      headerKicker: 'فاز ۱',
      headerPill: '۲ هفته',
      headerEmoji: '🧭',
      blocks: [
        { id: 'p1-t1', type: 'section-title', text: 'جدول سرفصل‌ها و منابع فاز ۱' },
        {
          id: 'p1-table',
          type: 'resource-table',
          headers: ['سرفصل', 'منبع آموزشی', 'منبع تمرین'],
          rows: [
            {
              taskKeys: ['p1-sec450'],
              cells: [
                'مبانی تیم آبی و SOC',
                'مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱',
                '—',
              ],
            },
            {
              taskKeys: ['p1-elastic-course', 'p1-elastic-video1', 'p1-elastic-basics', 'p1-elastic-query'],
              cells: [
                'آموزش استفاده از Elastic',
                '[دوره آموزشی سایت Elastic](\\\\ShareFolder\\mssp\\Ring 2 - Roadmap\\1 - Elastic Security for SIEM)\n[ویدئوی شماره یک ماژول Elastic از ویدئوهای Log Semantics](\\\\ShareFolder\\mssp\\Log Semantics\\Elastic)',
                '[Elastic Stack: The Basics](https://tryhackme.com/room/elasticstackthebasics)\n[Elastic: Query Languages](https://tryhackme.com/room/elasticquerylanguages)',
              ],
            },
            {
              taskKeys: [
                'p1-splunk-fund1',
                'p1-splunk-fund2-m10',
                'p1-splunk-es-videos',
                'p1-splunk-basics-room',
                'p1-splunk-investigate',
              ],
              cells: [
                'آموزش استفاده از Splunk',
                '[دوره Splunk Fundamentals 1](\\\\ShareFolder\\mssp\\0-11-Splunk\\1-splunk\\Splunk Fundamentals 1 - Mohammad Ghanbari)\n[ماژول ۱۰ دوره Splunk Fundamentals 2](\\\\ShareFolder\\mssp\\0-11-Splunk\\1-splunk\\Splunk Fundamentals 2 - Mohammad Ghanbari)\n[ویدئوهای شماره ۱ و ۲ آموزش ES](\\\\ShareFolder\\mssp\\0-11-Splunk\\5- Splunk-ES Basiri)',
                '[Splunk Basics - Did you SIEM?](https://tryhackme.com/room/splunk100)\n[Investigating with Splunk](https://tryhackme.com/room/investigatingwithsplunk)',
              ],
            },
          ],
        },
        { id: 'p1-t2', type: 'section-title', text: 'روند ادامهٔ کار و ارزیابی فاز ۱' },
        {
          id: 'p1-steps',
          type: 'bullets',
          items: [
            'دسترسی [TryHackMe](https://tryhackme.com) از طرف کارشناس لایه سه ارسال خواهد شد.',
            'با آغاز این فاز دسترسی به ۴ ماشین SIEM به‌صورت آزمایشی برقرار خواهد شد؛ لطفاً برای تمرین از این ماشین‌ها استفاده کنید.',
            'دسترسی به Elastic و Splunk آزمایشگاه MSSP ([راهنمای دسترسی](https://confluence.apk-group.net/spaces/MP/pages/151094607/Yazd+MSSP+Lab))',
            'دسترسی به یک پروژه Elastic و Splunk واقعی (توسط کارشناس لایه سه ارسال خواهد شد)',
            'پس از پایان این فاز یک جلسه ارزیابی با کارشناس لایه سه برگزار خواهد شد. این جلسه شامل بررسی نظری و عملی مطالب تدریس‌شده می‌باشد.',
          ],
        },
      ],
    },
    'phase-2': {
      headerTitle: 'آموزش شبکه',
      headerKicker: 'فاز ۲',
      headerPill: '۲ هفته',
      headerEmoji: '🌐',
      blocks: [
        { id: 'p2-t1', type: 'section-title', text: 'جدول سرفصل‌ها و منابع فاز ۲' },
        {
          id: 'p2-table',
          type: 'resource-table',
          headers: ['سرفصل', 'منبع آموزشی', 'منبع تمرین'],
          rows: [
            {
              taskKeys: ['p2-sec450-net', 'p2-net-video', 'p2-wireshark', 'p2-nsm'],
              cells: [
                'تشخیص تهدیدات شبکه',
                'مطابق با سرفصل ارائه شده SANS SEC 450 در پیوست ۱\n[ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM](\\\\ShareFolder\\mssp\\Log Semantics)',
                '[Wireshark: Traffic Analysis](https://tryhackme.com/room/wiresharktrafficanalysis)\n[Network Security Monitoring (except Snort)](https://tryhackme.com/module/network-security-monitoring)',
              ],
            },
            {
              taskKeys: ['p2-dns'],
              cells: [
                'تشخیص تهدیدات DNS',
                'مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱\n[ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM](\\\\ShareFolder\\mssp\\Log Semantics)',
                '—',
              ],
            },
            {
              taskKeys: ['p2-web', 'p2-foundations'],
              cells: [
                'تشخیص تهدیدات Web',
                'مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱\n[ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM](\\\\ShareFolder\\mssp\\Log Semantics)\n[مسیر Soc T1 D – Foundations در پرتال آموزشی](/portal/soc-t1-d-foundations)',
                '—',
              ],
            },
          ],
        },
        { id: 'p2-t2', type: 'section-title', text: 'روند ادامهٔ کار و ارزیابی فاز ۲' },
        {
          id: 'p2-steps',
          type: 'bullets',
          items: [
            'دسترسی [TryHackMe](https://tryhackme.com) و [پرتال آموزشی](/portal) از طرف کارشناس لایه سه ارسال خواهد شد.',
            'لطفاً در حین یادگیری، روی پروژه‌های واقعی نیز یوزکیس‌های آموزش‌داده‌شده بررسی شوند و موارد مشکوک مشاهده‌شده در پروژه‌ها در قالب یک گزارش کوتاه برای کارشناس لایه سه ارسال شود. این گزارش‌ها بخشی از مرحله ارزیابی این فاز به حساب می‌آیند.',
            'پس از پایان این فاز یک جلسه ارزیابی با کارشناس لایه سه برگزار خواهد شد. این جلسه شامل بررسی نظری و عملی مطالب تدریس‌شده می‌باشد.',
          ],
        },
      ],
    },
    'phase-3': {
      headerTitle: 'آموزش Endpoint',
      headerKicker: 'فاز ۳',
      headerPill: '۱ هفته',
      headerEmoji: '💻',
      blocks: [
        { id: 'p3-t1', type: 'section-title', text: 'جدول سرفصل‌ها و منابع فاز ۳' },
        {
          id: 'p3-table',
          type: 'resource-table',
          headers: ['سرفصل', 'منبع آموزشی', 'منبع تمرین'],
          rows: [
            {
              taskKeys: ['p3-win-sysmon', 'p3-win-video', 'p3-win-mon'],
              cells: [
                'تشخیص تهدیدات ویندوز',
                'مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱\n[Sysmon](https://tryhackme.com/room/sysmon)\n[ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM](\\\\ShareFolder\\mssp\\Log Semantics)',
                '[Windows Security Monitoring](https://tryhackme.com/module/windows-security-monitoring)',
              ],
            },
            {
              taskKeys: ['p3-linux', 'p3-linux-mon'],
              cells: [
                'تشخیص تهدیدات لینوکس',
                'مطابق با سرفصل ارائه شده در SANS SEC 450 در پیوست ۱\n[ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM](\\\\ShareFolder\\mssp\\Log Semantics)',
                '[Linux Security Monitoring](https://tryhackme.com/module/linux-security-monitoring)',
              ],
            },
            {
              taskKeys: ['p3-hidps-video'],
              cells: [
                'بررسی هشدارهای HIDPS',
                '[ویدئوی مربوطه در مجموعه Log Semantics برای هر دو SIEM](\\\\ShareFolder\\mssp\\Log Semantics)',
                '—',
              ],
            },
          ],
        },
        { id: 'p3-t2', type: 'section-title', text: 'روند ادامهٔ کار و ارزیابی فاز ۳' },
        {
          id: 'p3-steps',
          type: 'bullets',
          items: [
            'دسترسی [TryHackMe](https://tryhackme.com) از طرف کارشناس لایه سه ارسال خواهد شد.',
            'لطفاً در حین یادگیری، روی پروژه‌های واقعی نیز یوزکیس‌های آموزش‌داده‌شده بررسی شوند و موارد مشکوک مشاهده‌شده در پروژه‌ها در قالب یک گزارش کوتاه برای کارشناس لایه سه ارسال شود. این گزارش‌ها بخشی از مرحله ارزیابی این فاز به حساب می‌آیند.',
            'در این فاز چند سناریوی عملی نیز توسط کارشناس لایه سه ارسال خواهند شد. این سناریوها بایستی در محیط آزمایشگاه پیاده‌سازی شده و نتیجه آن در قالب گزارش به کارشناس لایه سه ارسال گردد. این گزارش بخشی از مرحله ارزیابی این فاز به حساب می‌آید.',
            'پس از پایان این فاز یک جلسه ارزیابی با کارشناس لایه سه برگزار خواهد شد. این جلسه شامل بررسی نظری و عملی مطالب تدریس‌شده می‌باشد.',
          ],
        },
      ],
    },
    'phase-4': {
      headerTitle: 'Onboarding',
      headerKicker: 'فاز ۴',
      headerPill: '۱ هفته',
      headerEmoji: '🚀',
      blocks: [
        { id: 'p4-t1', type: 'section-title', text: 'شرح فرآیندها و آموزش‌ها' },
        {
          id: 'p4-desc',
          type: 'bullets',
          items: [
            'در این فاز روندها و فرآیندهای تکمیلی و سیاست‌های رصد و پایش مختص پروژه‌های رینگ توسط کارشناس لایه دو و مدیر سرویس رینگ مربوطه آموزش داده خواهد شد.',
            'در این فاز دسترسی پروژه‌های رینگ از طرف کارشناس لایه دو و مدیر سرویس ارسال خواهد شد.',
            'ارزیابی این فاز توسط کارشناس لایه دو و مدیر سرویس رینگ بر پایه OKRهای زیر صورت خواهد پذیرفت.',
          ],
        },
        { id: 'p4-t2', type: 'section-title', text: 'روند ارزیابی و OKRهای فاز ۴' },
        {
          id: 'p4-okrs',
          type: 'numbered',
          items: [
            'رصد و پایش هر پروژه حداقل به اندازه یک شیفت اداری',
            'ثبت یک تیکت Security Event به ازای هر پروژه در سامانه جیرا',
            'ثبت حداقل یک تیکت Fine Tuning به ازای هر فناوری SIEM (یک تیکت برای Elastic و یک تیکت برای Splunk) در سامانه جیرا',
            'بررسی حداقل یک تیکت AI',
          ],
        },
      ],
    },
    appendix: {
      headerTitle: 'پیوست ۱: مراجع SANS SEC450',
      headerKicker: 'APPENDIX ۱',
      headerEmoji: '📑',
      blocks: [
        { id: 'ap-t1', type: 'section-title', text: 'جدول تطبیقی جلسات، جزوات و ویدئوهای لیان و راوین' },
        {
          id: 'ap-table',
          type: 'simple-table',
          headers: ['مبحث', 'جزوه', 'ویدئو (لیان)', 'ویدئو (راوین)'],
          rows: [
            { cells: ['مبانی تیم آبی و SOC', 'شماره ۱ (از صفحه ۵ تا ۵۱)', 'شماره ۱', '—'] },
            {
              cells: [
                'تشخیص تهدیدات شبکه',
                'شماره ۲ (از صفحه ۷ تا ۳۶)',
                'شماره ۳ (از دقیقه ۱:۱۳ تا پایان)',
                '• روز ۲ بخش ۴ (از ابتدا تا دقیقه ۱:۰۰)\n• روز ۵ بخش ۲ (از ابتدا تا دقیقه ۰:۳۳)',
              ],
            },
            {
              cells: [
                'تشخیص تهدیدات DNS',
                'شماره ۲ (از صفحه ۳۷ تا ۹۳)',
                'شماره ۴',
                'از روز ۲ بخش ۴ دقیقه ۱:۱۵ تا پایان روز ۳ بخش ۳',
              ],
            },
            {
              cells: [
                'تشخیص تهدیدات Web',
                'شماره ۲ (از صفحه ۹۴ تا ۱۵۰)',
                'شماره ۵',
                '• روز ۳ بخش ۴ (از ابتدا تا دقیقه ۰:۵۰)\n• روز ۴ بخش ۱ و ۲',
              ],
            },
          ],
        },
        { id: 'ap-t2', type: 'section-title', text: 'منابع و دانلودها' },
        {
          id: 'ap-dl',
          type: 'bullets',
          items: [
            'بنا به تشخیص و صلاح‌دید می‌توانید جهت تکمیل دوره ۴۵۰ از یکی از منابع ذکر شده استفاده کنید.',
            '[دانلود جزوه و اسلایدهای دوره](\\\\ShareFolder\\mssp\\450\\SEC450 - Blue Team Fundamentals Security Operations and Analysis)',
            '[دانلود ویدئوهای دوره - موسسه لیان](\\\\ShareFolder\\mssp\\450)',
            '[دانلود ویدئوهای دوره - موسسه راوین](\\\\ShareFolder\\mssp\\1-4-SOC Teir 1)',
          ],
        },
        {
          id: 'ap-note',
          type: 'note',
          text: 'نکته تمرین در منزل: جهت تمرین‌های تکمیلی دوره، ماشین مجازی (VM) دوره در منزل در اختیار شما قرار می‌گیرد. برای هماهنگی دریافت آن با کارشناس لایه ۳ هماهنگ کنید.',
        },
      ],
    },
  },
};
