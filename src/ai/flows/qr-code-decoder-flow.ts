
'use server';
/**
 * @fileOverview Decodes QR codes from an image using an AI model.
 *
 * - decodeQrCodeFromImage - A function that decodes a QR code from an image data URI.
 * - QrCodeDecoderInput - The input type for the decodeQrCodeFromImage function.
 * - QrCodeDecoderOutput - The return type for the decodeQrCodeFromImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const QrCodeDecoderInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image containing a QR code, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type QrCodeDecoderInput = z.infer<typeof QrCodeDecoderInputSchema>;

const QrCodeDecoderOutputSchema = z.object({
  decodedContent: z.string().describe("The decoded content of the QR code. Empty if not found or not decodable."),
});
export type QrCodeDecoderOutput = z.infer<typeof QrCodeDecoderOutputSchema>;

export async function decodeQrCodeFromImage(input: QrCodeDecoderInput): Promise<QrCodeDecoderOutput> {
  return qrCodeDecoderFlow(input);
}

const qrCodeDecoderPrompt = ai.definePrompt({
  name: 'qrCodeDecoderPrompt',
  input: {schema: QrCodeDecoderInputSchema},
  output: {schema: QrCodeDecoderOutputSchema},
  prompt: `You are an expert QR code reader.
Analyze the provided image and extract the content of any QR code present.
Image: {{media url=imageDataUri}}

Based on your analysis, populate the 'decodedContent' field in the output.
If a QR code is found and successfully decoded, the 'decodedContent' field should contain its textual content.
If multiple QR codes are present in the image, use the content of the first one you clearly identify.
If no QR code is found in the image, or if the QR code cannot be reliably decoded, the 'decodedContent' field should be an empty string.
Ensure the output strictly adheres to the provided schema.
`,
});

const qrCodeDecoderFlow = ai.defineFlow(
  {
    name: 'qrCodeDecoderFlow',
    inputSchema: QrCodeDecoderInputSchema,
    outputSchema: QrCodeDecoderOutputSchema,
  },
  async input => {
    const {output} = await qrCodeDecoderPrompt(input);
    if (!output) {
      // This case should ideally not happen if the LLM adheres to the schema,
      // but as a fallback, return empty content.
      return { decodedContent: "" };
    }
    return output;
  }
);
