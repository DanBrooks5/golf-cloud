// lib/native-trim.ts

export interface NativeTrimPlugin {
  trim(options: { path: string }): Promise<{ path: string }>;
}

// Simple shim used on web/SSR or if the native plugin isn't available
const shim: NativeTrimPlugin = {
  async trim({ path }) {
    // No-op on web: return original path
    return { path };
  },
};

// We'll assign this at module load
let NativeTrim: NativeTrimPlugin = shim;

if (typeof window !== 'undefined') {
  try {
    // Dynamic import so SSR doesn't choke and types stay happy
    const { registerPlugin } = await import('@capacitor/core');
    NativeTrim = registerPlugin<NativeTrimPlugin>('NativeTrim');
  } catch {
    // If Capacitor isn't present (web), stick with the shim
    NativeTrim = shim;
  }
}

export { NativeTrim };


