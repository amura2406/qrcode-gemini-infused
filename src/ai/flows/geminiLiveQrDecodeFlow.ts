// Indicates that this code should be executed on the server.
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit/zod';

// Define the input schema for the Gemini Live QR Decode flow.
// It expects a base64 encoded image string.
export const GeminiLiveQrDecodeInputSchema = z.object({
  imageString: z.string().describe('A base64 encoded image string of the video frame.'),
});
export type GeminiLiveQrDecodeInput = z.infer<typeof GeminiLiveQrDecodeInputSchema>;

// Define the output schema for the Gemini Live QR Decode flow.
// It returns the decoded QR data, if found.
export const GeminiLiveQrDecodeOutputSchema = z.object({
  qrData: z.string().optional().describe('The decoded data from the QR code, if found.'),
});
export type GeminiLiveQrDecodeOutput = z.infer<typeof GeminiLiveQrDecodeOutputSchema>;

// Define the Genkit prompt for QR code decoding.
// This prompt instructs the Gemini model to act as a QR code reader.
export const geminiLiveQrDecodePrompt = ai.definePrompt(
  {
    name: 'geminiLiveQrDecodePrompt',
    model: 'geminiProVision', // Placeholder model, might need adjustment
    inputSchema: GeminiLiveQrDecodeInputSchema,
    outputSchema: GeminiLiveQrDecodeOutputSchema,
    prompt: (input) => `
      You are a highly accurate QR code reader. Analyze the provided image.
      If you find a QR code, extract its content precisely.
      If no QR code is visible or it is unreadable, return empty or null for the QR data.
      Image:
      {{{imageString}}}
    `,
  },
  async (input) => {
    // This function is called with the output of the model.
    // We need to ensure the output matches the GeminiLiveQrDecodeOutputSchema.
    // If the model returns nothing or an empty object,
    // we return { qrData: undefined } to satisfy the schema.
    if (!input || typeof input.qrData === 'undefined') {
      return { qrData: undefined };
    }
    return input;
  }
);

// Define the Genkit flow for QR code decoding.
// This flow uses the geminiLiveQrDecodePrompt to process the image.
export const geminiLiveQrDecodeFlow = ai.defineFlow(
  {
    name: 'geminiLiveQrDecodeFlow',
    inputSchema: GeminiLiveQrDecodeInputSchema,
    outputSchema: GeminiLiveQrDecodeOutputSchema,
  },
  async (input) => {
    // Call the geminiLiveQrDecodePrompt with the input.
    const output = await geminiLiveQrDecodePrompt.generate({ input });

    // Ensure the output matches the GeminiLiveQrDecodeOutputSchema.
    // If the model returns nothing or an empty object,
    // return { qrData: undefined } to satisfy the schema.
    // The prompt's output function should handle this, but it's good to be safe.
    if (!output.output || typeof output.output.qrData === 'undefined') {
        return { qrData: undefined };
      }
    return output.output;
  }
);

// Export the flow for use in other parts of the application.
export default geminiLiveQrDecodeFlow;
