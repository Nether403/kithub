"use client";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMarkdown(md: string): string {
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---/);
  let body = md;
  let frontmatterHtml = "";

  if (fmMatch) {
    body = md.slice(fmMatch[0].length).trim();
    const fmLines = fmMatch[1]!.split("\n");
    frontmatterHtml = `<div class="md-preview-frontmatter"><div class="md-preview-fm-title">Frontmatter</div>${fmLines
      .map((line) => {
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0) {
          const key = escapeHtml(line.slice(0, colonIdx).trim());
          const val = escapeHtml(line.slice(colonIdx + 1).trim());
          return `<div class="md-preview-fm-row"><span class="md-preview-fm-key">${key}:</span> <span class="md-preview-fm-val">${val}</span></div>`;
        }
        return `<div class="md-preview-fm-row">${escapeHtml(line)}</div>`;
      })
      .join("")}</div>`;
  }

  let html = escapeHtml(body);

  html = html.replace(/^### (.+)$/gm, '<h3 class="md-preview-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="md-preview-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="md-preview-h1">$1</h1>');

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`([^`]+)`/g, '<code class="md-preview-code">$1</code>');

  html = html.replace(/^- (.+)$/gm, '<li class="md-preview-li">$1</li>');
  html = html.replace(
    /(<li class="md-preview-li">[\s\S]*?<\/li>)/g,
    '<ul class="md-preview-ul">$1</ul>'
  );
  html = html.replace(/<\/ul>\s*<ul class="md-preview-ul">/g, "");

  html = html.replace(/\n{2,}/g, '<div class="md-preview-spacer"></div>');

  return frontmatterHtml + html;
}

export default function MarkdownPreview({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <div className="md-preview-empty">
        Start typing to see a live preview of your kit
      </div>
    );
  }

  return (
    <div
      className="md-preview-body"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
