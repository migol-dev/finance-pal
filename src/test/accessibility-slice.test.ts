import { describe, it, expect, beforeEach } from 'vitest';
import { useFinance } from '@/store/finance-store';
import { DEFAULT_ACCESSIBILITY_SETTINGS } from '@/lib/finance';

describe('accessibility settings slice', () => {
  beforeEach(() => {
    useFinance.getState().resetAll();
  });

  it('initializes with default accessibility settings', () => {
    const a11y = useFinance.getState().appSettings.accessibility;
    expect(a11y).toEqual(DEFAULT_ACCESSIBILITY_SETTINGS);
    expect(a11y.textScale).toBe('normal');
    expect(a11y.highContrast).toBe(false);
    expect(a11y.reduceMotion).toBe(false);
    expect(a11y.dyslexicFont).toBe(false);
    expect(a11y.underlineLinks).toBe(false);
    expect(a11y.largeTouchTargets).toBe(false);
    expect(a11y.colorBlindMode).toBe('none');
    expect(a11y.enhancedFocusRing).toBe(true);
  });

  it('updates individual accessibility settings', () => {
    useFinance.getState().setAccessibilitySettings({ highContrast: true, textScale: 'large' });
    let a11y = useFinance.getState().appSettings.accessibility;
    expect(a11y.highContrast).toBe(true);
    expect(a11y.textScale).toBe('large');
    expect(a11y.reduceMotion).toBe(false);

    useFinance.getState().setAccessibilitySettings({ colorBlindMode: 'deuteranopia', dyslexicFont: true });
    a11y = useFinance.getState().appSettings.accessibility;
    expect(a11y.colorBlindMode).toBe('deuteranopia');
    expect(a11y.dyslexicFont).toBe(true);
    expect(a11y.highContrast).toBe(true);
  });

  it('can reset accessibility settings back to defaults', () => {
    useFinance.getState().setAccessibilitySettings({
      highContrast: true,
      textScale: 'xlarge',
      largeTouchTargets: true,
    });
    expect(useFinance.getState().appSettings.accessibility.textScale).toBe('xlarge');

    useFinance.getState().setAccessibilitySettings(DEFAULT_ACCESSIBILITY_SETTINGS);
    expect(useFinance.getState().appSettings.accessibility).toEqual(DEFAULT_ACCESSIBILITY_SETTINGS);
  });
});
