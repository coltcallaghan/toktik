import Anthropic from '@anthropic-ai/sdk';

/**
 * Shared Anthropic client with automatic retries for 429/529 errors.
 * The SDK retries up to `maxRetries` times with exponential backoff.
 */
export function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 3,
  });
}
