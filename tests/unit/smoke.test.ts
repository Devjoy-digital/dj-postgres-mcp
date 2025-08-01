// Basic smoke test to verify setup works
describe('Smoke Test', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async tests', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });
});