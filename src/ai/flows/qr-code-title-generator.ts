'use server';
/**
 * @fileOverview Generates a title for QR code content using AI.
 *
 * - generateQrCodeTitle - A function that generates a title for QR code content.
 * - QrCodeTitleGeneratorInput - The input type for the generateQrCodeTitle function.
 * - QrCodeTitleGeneratorOutput - The return type for the generateQrCodeTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const QrCodeTitleGeneratorInputSchema = z.object({
  qrCodeContent: z.string().describe('The content decoded from the QR code.'),
});
export type QrCodeTitleGeneratorInput = z.infer<typeof QrCodeTitleGeneratorInputSchema>;

const QrCodeTitleGeneratorOutputSchema = z.object({
  title: z.string().describe('A descriptive title for the QR code content.'),
});
export type QrCodeTitleGeneratorOutput = z.infer<typeof QrCodeTitleGeneratorOutputSchema>;

export async function generateQrCodeTitle(input: QrCodeTitleGeneratorInput): Promise<QrCodeTitleGeneratorOutput> {
  return qrCodeTitleGeneratorFlow(input);
}

const analyzeQrCodeContentTool = ai.defineTool({
    name: 'analyzeQrCodeContent',
    description: 'Analyzes the content of a QR code to determine its type and purpose.',
    inputSchema: z.object({
      content: z.string().describe('The content of the QR code to analyze.'),
    }),
    outputSchema: z.string().describe('A description of the QR code content, including its type (e.g., URL, text, contact info) and its purpose (e.g., opens a website, displays a message, adds a contact).'),
  },
  async (input) => {
    // Basic content analysis (expand this to cover more types)
    if (input.content.startsWith('http://') || input.content.startsWith('https://')) {
      return 'The QR code contains a URL that likely opens a website.';
    } else if (input.content.includes('@')) {
      return 'The QR code likely contains contact information, such as an email address.';
    } else {
      return 'The QR code contains a text message or other data.';
    }
  }
);

const qrCodeTitleGeneratorPrompt = ai.definePrompt({
  name: 'qrCodeTitleGeneratorPrompt',
  input: {schema: QrCodeTitleGeneratorInputSchema},
  output: {schema: QrCodeTitleGeneratorOutputSchema},
  tools: [analyzeQrCodeContentTool],
  prompt: `You are an expert at generating concise and descriptive titles for QR code content.

  Based on the content of the QR code, generate a title that accurately reflects its purpose.

  Content: {{{qrCodeContent}}}

  Consider using the analyzeQrCodeContent tool to better understand the content.
  `, 
});

const qrCodeTitleGeneratorFlow = ai.defineFlow(
  {
    name: 'qrCodeTitleGeneratorFlow',
    inputSchema: QrCodeTitleGeneratorInputSchema,
    outputSchema: QrCodeTitleGeneratorOutputSchema,
  },
  async input => {
    const {output} = await qrCodeTitleGeneratorPrompt(input);
    return output!;
  }
);
