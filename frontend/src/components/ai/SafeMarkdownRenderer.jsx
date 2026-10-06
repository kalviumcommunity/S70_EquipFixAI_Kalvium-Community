import React, { useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked with GFM, tables, and breaks
const renderer = new marked.Renderer();

// Custom code block renderer with language badge and copy code button
renderer.code = function ({ text, lang }) {
  const language = (lang || 'code').trim();
  const rawCode = text || '';
  // Base64 encode code to safely embed into data attribute without escaping issues
  let encodedCode = '';
  try {
    encodedCode = btoa(unescape(encodeURIComponent(rawCode)));
  } catch (_) {
    encodedCode = '';
  }

  const escapedContent = rawCode
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return `
    <div class="ai-code-block">
      <div class="ai-code-header">
        <span class="ai-code-lang">${language.toUpperCase()}</span>
        <button type="button" class="ai-code-copy-btn" data-code="${encodedCode}">
          <svg class="ai-copy-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          <span class="ai-copy-text">Copy code</span>
        </button>
      </div>
      <pre><code class="language-${language}">${escapedContent}</code></pre>
    </div>
  `;
};

// Custom responsive table wrapper
renderer.table = function ({ header, rows }) {
  return `
    <div class="ai-table-wrap">
      <table class="ai-table">
        <thead>${header}</thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
};

// Custom safe external links
renderer.link = function ({ href, title, text }) {
  const safeHref = href && href.startsWith('http') ? href : '#';
  const titleAttr = title ? ` title="${title}"` : '';
  return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer"${titleAttr} class="ai-link">${text}</a>`;
};

marked.setOptions({
  renderer,
  gfm: true,
  breaks: true
});

let stylesInjected = false;
function injectMarkdownStyles() {
  if (stylesInjected || typeof document === 'undefined') return;
  stylesInjected = true;

  const styleId = 'equipfix-markdown-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
    .ai-markdown-content {
      color: #1e293b;
      font-size: 0.925rem;
      line-height: 1.68;
      word-break: break-word;
    }
    .ai-markdown-content p {
      margin: 0 0 10px 0;
    }
    .ai-markdown-content p:last-child {
      margin-bottom: 0;
    }
    .ai-markdown-content h1,
    .ai-markdown-content h2,
    .ai-markdown-content h3,
    .ai-markdown-content h4 {
      color: #0f172a;
      font-weight: 700;
      margin: 16px 0 8px 0;
      line-height: 1.35;
    }
    .ai-markdown-content h1 { font-size: 1.25rem; }
    .ai-markdown-content h2 { font-size: 1.12rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
    .ai-markdown-content h3 { font-size: 1.02rem; color: #1e293b; }
    .ai-markdown-content h4 { font-size: 0.92rem; color: #334155; }

    .ai-markdown-content ul,
    .ai-markdown-content ol {
      margin: 6px 0 12px 0;
      padding-left: 22px;
    }
    .ai-markdown-content li {
      margin-bottom: 5px;
      line-height: 1.6;
    }
    .ai-markdown-content li::marker {
      color: #3b82f6;
    }
    .ai-markdown-content ol > li::marker {
      font-weight: 600;
      color: #2563eb;
    }

    .ai-markdown-content blockquote {
      margin: 12px 0;
      padding: 10px 16px;
      background: #f8fafc;
      border-left: 4px solid #3b82f6;
      border-radius: 4px;
      color: #475569;
      font-style: italic;
    }

    /* Code Blocks */
    .ai-code-block {
      margin: 12px 0;
      border-radius: 8px;
      background: #0f172a;
      border: 1px solid #1e293b;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    }
    .ai-code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 14px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      font-size: 0.72rem;
      font-weight: 600;
      color: #94a3b8;
      letter-spacing: 0.04em;
    }
    .ai-code-copy-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: transparent;
      border: 1px solid #475569;
      border-radius: 5px;
      color: #cbd5e1;
      font-size: 0.7rem;
      padding: 3px 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .ai-code-copy-btn:hover {
      background: #334155;
      color: #ffffff;
      border-color: #64748b;
    }
    .ai-code-copy-btn.copied {
      background: #15803d;
      color: #ffffff;
      border-color: #22c55e;
    }
    .ai-code-block pre {
      margin: 0;
      padding: 12px 16px;
      overflow-x: auto;
      background: #0f172a;
    }
    .ai-code-block code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.84rem;
      color: #e2e8f0;
      line-height: 1.6;
    }

    /* Inline code */
    .ai-markdown-content :not(pre) > code {
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 6px;
      border-radius: 5px;
      font-size: 0.85em;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      border: 1px solid #e2e8f0;
    }

    /* Responsive Tables */
    .ai-table-wrap {
      width: 100%;
      margin: 14px 0;
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      background: #ffffff;
    }
    .ai-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      text-align: left;
    }
    .ai-table th {
      background: #f8fafc;
      color: #334155;
      font-weight: 700;
      padding: 10px 14px;
      border-bottom: 2px solid #cbd5e1;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .ai-table td {
      padding: 9px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .ai-table tr:last-child td {
      border-bottom: none;
    }
    .ai-table tr:nth-child(even) td {
      background: #fafafa;
    }

    /* Links */
    .ai-link {
      color: #2563eb;
      text-decoration: underline;
      font-weight: 500;
    }
    .ai-link:hover {
      color: #1d4ed8;
    }
  `;
  document.head.appendChild(style);
}

/**
 * SafeMarkdownRenderer
 * Safely renders markdown into sanitized HTML with interactive code blocks and responsive tables.
 */
export const SafeMarkdownRenderer = ({ content = '' }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    injectMarkdownStyles();
  }, []);

  // Event delegation for copying code blocks
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleCopyClick = (e) => {
      const btn = e.target.closest('.ai-code-copy-btn');
      if (!btn) return;

      const encoded = btn.getAttribute('data-code');
      let textToCopy = '';
      if (encoded) {
        try {
          textToCopy = decodeURIComponent(escape(atob(encoded)));
        } catch (_) {
          textToCopy = '';
        }
      }

      if (!textToCopy) {
        // Fallback: read innerText of adjacent pre code
        const codeEl = btn.closest('.ai-code-block')?.querySelector('code');
        if (codeEl) textToCopy = codeEl.innerText;
      }

      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          btn.classList.add('copied');
          const textSpan = btn.querySelector('.ai-copy-text');
          const original = textSpan ? textSpan.innerText : 'Copy code';
          if (textSpan) textSpan.innerText = 'Copied!';
          setTimeout(() => {
            btn.classList.remove('copied');
            if (textSpan) textSpan.innerText = original;
          }, 2000);
        }).catch(() => {});
      }
    };

    el.addEventListener('click', handleCopyClick);
    return () => el.removeEventListener('click', handleCopyClick);
  }, [content]);

  if (!content) return null;

  // 1. Parse markdown using marked
  let rawHtml = '';
  try {
    rawHtml = marked.parse(content);
  } catch (err) {
    rawHtml = `<p>${DOMPurify.sanitize(content)}</p>`;
  }

  // 2. Sanitize HTML via DOMPurify to prevent XSS
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['button', 'svg', 'path', 'rect'],
    ADD_ATTR: ['target', 'rel', 'data-code', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']
  });

  return (
    <div
      ref={containerRef}
      className="ai-markdown-content ai-response-root"
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
};

export default SafeMarkdownRenderer;
