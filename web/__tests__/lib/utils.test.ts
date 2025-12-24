import { describe, it, expect } from 'vitest';
import { formatTimestamp, cn } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('formatTimestamp', () => {
    it('should format timestamp correctly', () => {
      const date = new Date('2024-01-01T14:30:00');
      const formatted = formatTimestamp(date);

      expect(formatted).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
    });

    it('should use current date when no date provided', () => {
      const formatted = formatTimestamp();
      expect(formatted).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/);
    });
  });

  describe('cn (classnames utility)', () => {
    it('should combine class names', () => {
      const result = cn('class1', 'class2');
      expect(result).toContain('class1');
      expect(result).toContain('class2');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'conditional', false && 'excluded');
      expect(result).toContain('base');
      expect(result).toContain('conditional');
      expect(result).not.toContain('excluded');
    });
  });
});
