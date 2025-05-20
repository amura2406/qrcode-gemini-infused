
'use server';
/**
 * @fileOverview Summarizes the content of a webpage using its HTML.
 *
 * - summarizeWebpageContent - A function that summarizes webpage HTML.
 * - SummarizeWebpageInput - The input type for the summarizeWebpageContent function.
 * - SummarizeWebpageOutput - The return type for the summarizeWebpageContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeWebpageInputSchema = z.object({
  htmlContent: z.string().describe('The HTML content of the webpage to summarize.'),
  url: z.string().url().describe('The URL of the webpage (for context, if available).'),
});
export type SummarizeWebpageInput = z.infer<typeof SummarizeWebpageInputSchema>;

const SummarizeWebpageOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the main content or purpose of the webpage.'),
});
export type SummarizeWebpageOutput = z.infer<typeof SummarizeWebpageOutputSchema>;

export async function summarizeWebpageContent(input: SummarizeWebpageInput): Promise<SummarizeWebpageOutput> {
  return summarizeWebpageFlow(input);
}

const summarizeWebpagePrompt = ai.definePrompt({
  name: 'summarizeWebpagePrompt',
  input: {schema: SummarizeWebpageInputSchema},
  output: {schema: SummarizeWebpageOutputSchema},
  prompt: `You are an expert at summarizing web content. You will be provided with the HTML content of a webpage and its URL.
Your task is to generate a concise summary of the main content or purpose of this webpage.
Focus on what a user visiting this page (URL: {{{url}}}) would primarily be interested in.
If the HTML is malformed, very sparse, or contains very little textual content (e.g., it's primarily a login page or an error page with no details),
indicate that a meaningful summary cannot be provided or briefly state the observable nature of the page.

HTML Content:
\`\`\`html
{{{htmlContent}}}
\`\`\`
`,
});

const summarizeWebpageFlow = ai.defineFlow(
  {
    name: 'summarizeWebpageFlow',
    inputSchema: SummarizeWebpageInputSchema,
    outputSchema: SummarizeWebpageOutputSchema,
  },
  async (input) => {
    // Add a truncation safeguard for very large HTML, though Gemini can handle large contexts.
    // This is a basic example; more sophisticated truncation might preserve structure.
    const MAX_HTML_LENGTH = 30000; // Approx 7.5k tokens, well within Gemini 1.5 Flash 1M context
    let htmlToProcess = input.htmlContent;
    if (htmlToProcess.length > MAX_HTML_LENGTH) {
      htmlToProcess = htmlToProcess.substring(0, MAX_HTML_LENGTH) + "\n... (HTML truncated)";
    }

    const {output} = await summarizeWebpagePrompt({htmlContent: htmlToProcess, url: input.url});
    return output!;
  }
);
