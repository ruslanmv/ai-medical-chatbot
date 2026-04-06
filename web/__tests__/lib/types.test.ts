import { describe, it, expect } from 'vitest';
import { PROVIDER_CONFIGS } from '@/lib/types';
import type { Provider } from '@/lib/types';

describe('Provider Types', () => {
  it('should have all required provider configurations', () => {
    const providers: Provider[] = ['openai', 'gemini', 'claude', 'hf', 'ollabridge', 'ollama'];

    providers.forEach(provider => {
      expect(PROVIDER_CONFIGS[provider]).toBeDefined();
      expect(PROVIDER_CONFIGS[provider].name).toBe(provider);
      expect(PROVIDER_CONFIGS[provider].displayName).toBeDefined();
      expect(PROVIDER_CONFIGS[provider].requiresApiKey).toBeDefined();
      expect(Array.isArray(PROVIDER_CONFIGS[provider].models)).toBe(true);
    });
  });

  it('should have at least one model for each provider', () => {
    Object.values(PROVIDER_CONFIGS).forEach(config => {
      expect(config.models.length).toBeGreaterThan(0);
      config.models.forEach(model => {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
      });
    });
  });

  it('should correctly identify providers requiring API keys', () => {
    expect(PROVIDER_CONFIGS.openai.requiresApiKey).toBe(true);
    expect(PROVIDER_CONFIGS.gemini.requiresApiKey).toBe(true);
    expect(PROVIDER_CONFIGS.claude.requiresApiKey).toBe(true);
    expect(PROVIDER_CONFIGS.ollama.requiresApiKey).toBe(false);
  });
});
