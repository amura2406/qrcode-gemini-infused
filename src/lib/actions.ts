'use server';

import { generateQrCodeTitle, type QrCodeTitleGeneratorInput } from '@/ai/flows/qr-code-title-generator';

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
    // It's possible the AI flow itself might throw an error or return an unexpected structure.
    // For now, we'll return a generic error. More specific error handling could be added.
    if (e instanceof Error) {
        return { error: `AI title generation failed: ${e.message}`};
    }
    return { error: 'An unexpected error occurred during AI title generation.' };
  }
}
