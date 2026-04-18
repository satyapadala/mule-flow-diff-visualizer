export type LlmConfig = {
    endpoint: string;
    model: string;
    apiKey: string;
    systemPrompt: string;
};

export const DEFAULT_SYSTEM_PROMPT = `You are an expert MuleSoft integration reviewer.
Answer questions using the provided old XML, new XML, and flow diff summary.
Be concrete and reviewer-oriented.
Call out behavior changes, risk, and likely impact.
If the answer is uncertain, say so clearly.`;

export const DEFAULT_LLM_CONFIG: LlmConfig = {
    endpoint: '',
    model: '',
    apiKey: '',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
};

export const LLM_CONFIG_STORAGE_KEY = 'muleflow.llmConfig';

export function normalizeLlmConfig(value: unknown): LlmConfig {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { ...DEFAULT_LLM_CONFIG };
    }

    const record = value as Record<string, unknown>;
    return {
        endpoint: typeof record.endpoint === 'string' ? record.endpoint : '',
        model: typeof record.model === 'string' ? record.model : '',
        apiKey: typeof record.apiKey === 'string' ? record.apiKey : '',
        systemPrompt: typeof record.systemPrompt === 'string' && record.systemPrompt.trim()
            ? record.systemPrompt
            : DEFAULT_SYSTEM_PROMPT,
    };
}

export async function loadLlmConfig(): Promise<LlmConfig> {
    const stored = await chrome.storage.local.get(LLM_CONFIG_STORAGE_KEY);
    return normalizeLlmConfig(stored[LLM_CONFIG_STORAGE_KEY]);
}

export async function saveLlmConfig(config: LlmConfig): Promise<void> {
    await chrome.storage.local.set({
        [LLM_CONFIG_STORAGE_KEY]: normalizeLlmConfig(config),
    });
}
