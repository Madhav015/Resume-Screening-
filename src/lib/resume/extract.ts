// Turns an uploaded resume file (PDF or DOCX) into plain text we can feed
// to Claude. Kept deliberately dependency-light: unpdf for PDFs, mammoth for
// DOCX. Both run fine in a Vercel serverless (Node) function — neither works
// in the Edge runtime, so upload/scoring routes must NOT set
// `export const runtime = 'edge'`.
//
// Note: we use `unpdf` rather than the more commonly-suggested `pdf-parse`.
// pdf-parse bundles a years-old, unmaintained copy of PDF.js that throws
// ("bad XRef entry") on plenty of real-world PDFs — anything from ReportLab,
// some LibreOffice/Google Docs exports, etc. — because it's too strict about
// the cross-reference table structure. unpdf wraps a current, actively
// maintained PDF.js build with proper recovery for slightly-nonstandard
// files, which matters a lot here since agencies will upload resumes
// exported from all kinds of tools.

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
] as const;

export function isSupportedResumeFile(file: { type: string; name: string }) {
  if (SUPPORTED_MIME_TYPES.includes(file.type as any)) return true;
  // Some browsers/OSes send a blank or generic mime type for uploads —
  // fall back to the extension.
  return /\.(pdf|docx)$/i.test(file.name);
}

export async function extractResumeText(buffer: Buffer, fileName: string): Promise<string> {
  const isDocx = /\.docx$/i.test(fileName);

  if (isDocx) {
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ buffer });
    return normalize(value);
  }

  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return normalize(text);
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Claude's context window comfortably fits a resume, but we cap it as a
// safety net against someone uploading a 300-page PDF by mistake.
export const MAX_RESUME_CHARS = 20_000;

export function truncateResumeText(text: string): string {
  return text.length > MAX_RESUME_CHARS ? text.slice(0, MAX_RESUME_CHARS) + '\n[...truncated...]' : text;
}
