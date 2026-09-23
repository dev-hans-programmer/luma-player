import { describe, expect, it } from 'vitest';
import { isAllowedNavigation } from './security-policy';

describe('renderer navigation policy', () => {
  it('allows the packaged local renderer', () => {
    expect(
      isAllowedNavigation(
        'file:///Applications/Luma%20Player.app/Contents/Resources/app.asar/index.html',
        {
          isPackaged: true,
        },
      ),
    ).toBe(true);
  });

  it('rejects remote navigation from a packaged renderer', () => {
    expect(
      isAllowedNavigation('https://example.com', {
        isPackaged: true,
      }),
    ).toBe(false);
  });

  it('allows only the configured development origin', () => {
    const context = {
      isPackaged: false,
      developmentOrigin: 'http://localhost:5173',
    };

    expect(isAllowedNavigation('http://localhost:5173/', context)).toBe(true);
    expect(isAllowedNavigation('http://localhost:5174/', context)).toBe(false);
    expect(isAllowedNavigation('https://localhost:5173/', context)).toBe(false);
  });
});
