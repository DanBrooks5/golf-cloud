// lib/native-trim.ts
import { registerPlugin } from '@capacitor/core';

export interface NativeTrimPlugin {
  trim(options: { path: string }): Promise<{ path: string }>;
}

export const NativeTrim = registerPlugin<NativeTrimPlugin>('NativeTrim');
