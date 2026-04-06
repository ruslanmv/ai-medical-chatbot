import { describe, it, expect, vi } from 'vitest';

describe('Provider Integration Tests', () => {
  describe('Provider Structure', () => {
    it('should export chatWithProvider function', async () => {
      const { chatWithProvider } = await import('@/lib/providers');
      expect(typeof chatWithProvider).toBe('function');
    });

    it('should export streamWithProvider function', async () => {
      const { streamWithProvider } = await import('@/lib/providers');
      expect(typeof streamWithProvider).toBe('function');
    });

    it('should export verifyConnection function', async () => {
      const { verifyConnection } = await import('@/lib/providers');
      expect(typeof verifyConnection).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid provider', async () => {
      const { chatWithProvider } = await import('@/lib/providers');

      await expect(
        chatWithProvider({
          provider: 'invalid' as any,
          apiKey: 'test',
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toThrow();
    });

    it('should handle missing API key gracefully', async () => {
      const { verifyConnection } = await import('@/lib/providers');

      const result = await verifyConnection({
        provider: 'openai',
        apiKey: 'invalid-key',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
