# Test report / گزارش آزمون نسخه ۲.۰

## Result

PASS: 8 original API test groups, 5 expansion API test groups, JavaScript syntax checks, Python compilation, static HTML checks, and 184 bilingual render smoke cases using a DOM stub.

## What was checked

- First-owner bootstrap, concurrency, authentication, CSRF/Host protection, authorization, role/session behavior, privacy, article publication, invitation controls and throttling.
- All 30 lesson IDs can be saved as progress. All 40 case IDs can save/retrieve notes; guest rejection, member isolation and invalid-ID/closure rejection verified.
- A regression exposed that the original notes URL accepted only letters. The generated release permits letters followed by letters/digits while retaining the explicit case allowlist, so the S3 case now works. Re-tested successfully.
- All 40 playbooks contain SPL, an Elastic KQL/EQL example, four investigation steps, data needs, benign context, escalation, blind spots and source links.
- 30 lessons, 12 synthetic exercises, 40 glossary terms and 36 source-registry entries match the final catalog.
- Both Persian and English page templates, query tabs, note preservation on tab switching, bookmark filters, search escaping, empty states and quality-metric edge cases exercised using a DOM stub.
- A standalone single inline-script HTML with required landmarks and no external JS was checked. Font requests use Google Fonts with system fallback.

## Not checked / important limitations

- No installed Chromium/browser executable was available in the sandbox. Real-browser visual layout, keyboard navigation, responsive rendering, clipboard/download UX and browser end-to-end API workflows were NOT tested. DOM-stub renders are not browser certification.
- No Splunk or Elasticsearch/Elastic Security instance was connected. SPL, KQL, EQL and data contracts were NOT executed or validated against a live SIEM. No production performance, detection precision or recall claim is made.
- External official-source URLs were identified through web research; no exhaustive HTTP/link-health crawl or vendor endorsement was performed. Source pages may change.
- No penetration test, production security audit or internet deployment was performed. Backend remains a local development reference.

## Reproduce

```text
python test_server.py
python test_v2.py
node test_content.js
```

Python 3.12+ runs the app/API tests with no pip dependencies. Node is optional development tooling for content smoke tests only.

## Actual test output


### test_server.log

```text
test_01_bootstrap_and_concurrency (__main__.AcademyTests.test_01_bootstrap_and_concurrency) ... ok
test_02_authorization_and_csrf (__main__.AcademyTests.test_02_authorization_and_csrf) ... ok
test_03_content_and_xss_payload_storage (__main__.AcademyTests.test_03_content_and_xss_payload_storage) ... ok
test_04_progress_and_notes_isolation (__main__.AcademyTests.test_04_progress_and_notes_isolation) ... ok
test_05_roles_revoke_sessions_and_protect_owner (__main__.AcademyTests.test_05_roles_revoke_sessions_and_protect_owner) ... ok
test_06_invite_rotation_and_registration_switch (__main__.AcademyTests.test_06_invite_rotation_and_registration_switch) ... ok
test_07_login_throttle (__main__.AcademyTests.test_07_login_throttle) ... ok
test_08_audit_expiry_and_logout (__main__.AcademyTests.test_08_audit_expiry_and_logout) ... ok

----------------------------------------------------------------------
Ran 8 tests in 3.957s

OK

```

### test_v2.log

```text
test_01_catalog_allowlists (__main__.V2Tests.test_01_catalog_allowlists) ... ok
test_02_all_lesson_progress (__main__.V2Tests.test_02_all_lesson_progress) ... ok
test_03_all_case_notes_and_isolation (__main__.V2Tests.test_03_all_case_notes_and_isolation) ... ok
test_04_new_case_closure_validation (__main__.V2Tests.test_04_new_case_closure_validation) ... ok
test_05_static_serving_and_private_files (__main__.V2Tests.test_05_static_serving_and_private_files) ... ok

----------------------------------------------------------------------
Ran 5 tests in 1.186s

OK

```

### test_content.log

```text
PASS: 184 bilingual page renders; 40 playbooks, 30 lessons, 12 labs, 40 terms, 36 references; filters, search escaping, bookmarks, query tabs, notes preservation and metric edge cases. DOM stub only, no real browser or SIEM execution.

```
