
'use server';

import { generateQrCodeTitle, type QrCodeTitleGeneratorInput } from '@/ai/flows/qr-code-title-generator';
import { decodeQrCodeFromImage, type QrCodeDecoderInput } from '@/ai/flows/qr-code-decoder-flow';

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

export async function decodeQrCodeAction(imageDataUri: string): Promise<{ content?: string; error?: string }> {
  if (!imageDataUri) {
    return { error: 'Image data is missing. Cannot decode QR code.' };
  }
  try {
    const input: QrCodeDecoderInput = { imageDataUri };
    const result = await decodeQrCodeFromImage(input);
    // The flow is designed to return empty string for decodedContent if not found.
    return { content: result.decodedContent };
  } catch (e) {
    console.error('Error decoding QR code via AI:', e);
    if (e instanceof Error) {
        return { error: `QR code decoding failed: ${e.message}`};
    }
    return { error: 'An unexpected error occurred during QR code decoding.' };
  }
}
