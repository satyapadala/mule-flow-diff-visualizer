import { DEFAULT_SYSTEM_PROMPT, loadLlmConfig, saveLlmConfig } from './llm';

const endpointEl = document.getElementById('endpoint') as HTMLInputElement;
const modelEl = document.getElementById('model') as HTMLInputElement;
const apiKeyEl = document.getElementById('apiKey') as HTMLInputElement;
const systemPromptEl = document.getElementById('systemPrompt') as HTMLTextAreaElement;
const saveButton = document.getElementById('save-settings') as HTMLButtonElement;
const resetButton = document.getElementById('reset-settings') as HTMLButtonElement;
const statusEl = document.getElementById('status-message') as HTMLDivElement;

function setStatus(message: string, isError = false) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#ff7b72' : '#79c0ff';
}

async function hydrate() {
    const config = await loadLlmConfig();
    endpointEl.value = config.endpoint;
    modelEl.value = config.model;
    apiKeyEl.value = config.apiKey;
    systemPromptEl.value = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
}

saveButton.addEventListener('click', async () => {
    try {
        await saveLlmConfig({
            endpoint: endpointEl.value.trim(),
            model: modelEl.value.trim(),
            apiKey: apiKeyEl.value.trim(),
            systemPrompt: systemPromptEl.value.trim() || DEFAULT_SYSTEM_PROMPT,
        });
        setStatus('Settings saved.');
    } catch (error: any) {
        setStatus(error?.message || 'Failed to save settings.', true);
    }
});

resetButton.addEventListener('click', () => {
    systemPromptEl.value = DEFAULT_SYSTEM_PROMPT;
    setStatus('System prompt reset. Save when ready.');
});

hydrate().catch((error: any) => {
    setStatus(error?.message || 'Failed to load settings.', true);
});
