
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
  decodedContent: z.string().describe("The decoded content of the QR code. Should be an empty string if no QR code is found or if it cannot be reliably decoded."),
});
export type QrCodeDecoderOutput = z.infer<typeof QrCodeDecoderOutputSchema>;

export async function decodeQrCodeFromImage(input: QrCodeDecoderInput): Promise<QrCodeDecoderOutput> {
  return qrCodeDecoderFlow(input);
}

const qrCodeDecoderPrompt = ai.definePrompt({
  name: 'qrCodeDecoderPrompt',
  input: {schema: QrCodeDecoderInputSchema},
  output: {schema: QrCodeDecoderOutputSchema},
  prompt: `You are an expert QR code reader. Your task is to meticulously analyze the provided image and accurately extract the content of any QR code present.

Image: {{media url=imageDataUri}}

Follow these instructions carefully:
1.  Examine the image thoroughly to locate any QR codes.
2.  If a QR code is found and successfully decoded, the 'decodedContent' field in your output MUST contain the exact textual content of the QR code.
3.  If multiple QR codes are present in the image, use the content of the most prominent or clearest one you can identify.
4.  If no QR code is found in the image, or if the QR code is present but cannot be reliably decoded (e.g., it's blurry, obscured, or malformed), the 'decodedContent' field MUST be an empty string ("").
5.  Do not guess or provide any placeholder text if a QR code is not decodable. An empty string is the correct response in such cases.
6.  Ensure your output strictly adheres to the provided output schema. The 'decodedContent' field is the only field expected.

Provide only the decoded content or an empty string as per these rules.
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
    // Ensure output is not null and adheres to the schema,
    // defaulting to empty decodedContent if something unexpected happens.
    return output || { decodedContent: "" };
  }
);

