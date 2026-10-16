import { useAppStore } from '@/store/useAppStore';

const SCALE: Record<string, number> = {
  small: 0.85,
  medium: 1,
  large: 1.15,
  xlarge: 1.3,
};

export function useFontSize() {
  const fontSize = useAppStore((s) => s.fontSize);
  const scale = SCALE[fontSize] ?? 1;

  return {
    scale,
    fs: (base: number) => Math.round(base * scale),
  };
}
