import { useState } from 'react';

/** لینک: خارجی در تب جدید، Share/internal با منطق قبلی */
export function SmartLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const isExternal = /^https?:\/\//i.test(href);

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="guide-link">
        {children}
      </a>
    );
  }
  // لینک داخلی (مثل /portal/...) → همان‌جا باز شود
  if (href.startsWith('/')) {
    return (
      <a href={href} className="guide-link">
        {children}
      </a>
    );
  }

  const copyShareLink = async () => {
    const shareUrl = /^\\\\/.test(href)
      ? href
      : `\\\\ShareFolder\\${href.replace(/^\/+/, '').replace(/\//g, '\\')}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const helper = document.createElement('textarea');
      helper.value = shareUrl;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      helper.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 3200);
  };

  return (
    <>
      <button type="button" className="guide-link share-link" onClick={() => void copyShareLink()} title="کپی لینک Share">
        {children}
      </button>
      {copied && (
        <span className="toast share-copy-toast" role="status" aria-live="polite">
          لینک کپی شد؛ آن را در Run یا مرورگر وارد کنید.
        </span>
      )}
    </>
  );
}

/** پارس متن غنی: [لیبل](href) + شکست خط */
export default function RichText({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, li) => (
        <span key={li}>
          {li > 0 && <br />}
          <RichLine line={line} />
        </span>
      ))}
    </>
  );
}

function RichLine({ line }: { line: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) parts.push(<span key={k++}>{line.slice(last, m.index)}</span>);
    parts.push(
      <SmartLink key={k++} href={m[2].trim()}>
        {m[1]}
      </SmartLink>,
    );
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push(<span key={k++}>{line.slice(last)}</span>);
  if (parts.length === 0) return <span>{line}</span>;
  return <>{parts}</>;
}
