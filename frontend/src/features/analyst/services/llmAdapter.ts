import { AnalyticalResult } from '../types/analyst';

export interface ILlmAdapter {
  isExternalAvailable(): boolean;
  generateExplanation(result: AnalyticalResult): Promise<string>;
}

/**
 * Deterministic Explainer: Converts pre-computed analytical results into
 * clear, grounded, professional analytical conclusions without external API dependencies.
 */
export class DeterministicInsightExplainer implements ILlmAdapter {
  public isExternalAvailable(): boolean {
    return false;
  }

  public async generateExplanation(result: AnalyticalResult): Promise<string> {
    // Returns the data-grounded conclusion directly derived from deterministic calculations
    return result.conclusion;
  }
}

/**
 * Secure Server-Side Proxy LLM Adapter.
 * Does NOT store or send API keys from the frontend client.
 * Sends ONLY pre-calculated result data objects to a backend endpoint.
 * Automatically falls back to DeterministicInsightExplainer if unavailable or on error.
 */
export class SecureServerLlmAdapter implements ILlmAdapter {
  private fallback: DeterministicInsightExplainer = new DeterministicInsightExplainer();
  private endpointUrl: string | undefined;

  constructor() {
    this.endpointUrl = (import.meta as any).env?.VITE_ANALYST_API_URL;
  }

  public isExternalAvailable(): boolean {
    return Boolean(this.endpointUrl && this.endpointUrl.trim().length > 0);
  }

  public async generateExplanation(result: AnalyticalResult): Promise<string> {
    if (!this.isExternalAvailable()) {
      return this.fallback.generateExplanation(result);
    }

    try {
      const response = await fetch(this.endpointUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: result.intent,
          title: result.title,
          metrics: result.metrics,
          hotspots: result.hotspots,
          scope: result.dataScope,
        }),
      });

      if (!response.ok) {
        console.warn(`[LlmAdapter] Server proxy responded with ${response.status}. Falling back to deterministic explainer.`);
        return this.fallback.generateExplanation(result);
      }

      const data = await response.json();
      if (data && typeof data.explanation === 'string' && data.explanation.trim().length > 0) {
        return data.explanation;
      }
      return this.fallback.generateExplanation(result);
    } catch (err) {
      console.warn('[LlmAdapter] Failed to contact server-side LLM endpoint. Falling back to deterministic explainer.', err);
      return this.fallback.generateExplanation(result);
    }
  }
}

export const llmAdapter: ILlmAdapter = new SecureServerLlmAdapter();
