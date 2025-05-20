
'use server';

import { generateQrCodeTitle, type QrCodeTitleGeneratorInput } from '@/ai/flows/qr-code-title-generator';
import { summarizeWebpageContent, type SummarizeWebpageInput } from '@/ai/flows/summarize-webpage-flow';

export async function generateTitleAction(qrCodeContent: string): Promise<{ title?: string; error?: string }> {
  if (!qrCodeContent || qrCodeContent.trim() === '') {
    return { error: 'QR code content is empty. Cannot generate title.' };
  }
  try {
    const input: QrCodeTitleGeneratorInput = { qrCodeContent };
    const result = await generateQrCodeTitle(input);
    if (!result.title) {
        return { title: "Content Analysis" }; // Default title if AI returns empty
    }
    return { title: result.title };
  } catch (e) {
    console.error('Error generating title via AI:', e);
    if (e instanceof Error) {
        return { error: `AI title generation failed: ${e.message}`};
    }
    return { error: 'An unexpected error occurred during AI title generation.' };
  }
}

export async function summarizeWebpageAction(url: string): Promise<{ summary?: string; error?: string }> {
  if (!url || !url.startsWith('http')) {
    return { error: 'Invalid URL provided for summarization.' };
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) QRInfoRevealApp/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      redirect: 'follow', // Follow redirects
      signal: AbortSignal.timeout(10000) // Timeout after 10 seconds
    });

    if (!response.ok) {
      return { error: `Failed to fetch webpage: ${response.status} ${response.statusText}` };
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      return { error: `Content is not HTML. Received: ${contentType}` };
    }

    const htmlContent = await response.text();
    if (!htmlContent.trim()) {
        return { summary: "The webpage is empty or contains no visible content." };
    }

    const input: SummarizeWebpageInput = { htmlContent, url };
    const result = await summarizeWebpageContent(input);
    
    if (!result.summary) {
        return { summary: "AI could not generate a summary for this webpage."}
    }
    return { summary: result.summary };

  } catch (e) {
    console.error('Error summarizing webpage:', e);
    if (e instanceof Error) {
      if (e.name === 'AbortError' || e.message.includes('timed out')) {
        return { error: `AI webpage summarization failed: Request to fetch URL timed out.`};
      }
      return { error: `AI webpage summarization failed: ${e.message}`};
    }
    return { error: 'An unexpected error occurred during webpage summarization.' };
  }
}
