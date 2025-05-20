
import { config } from 'dotenv';
config();

import '@/ai/flows/qr-code-title-generator.ts';
// The QR code decoder flow has been removed as decoding is now done client-side.
