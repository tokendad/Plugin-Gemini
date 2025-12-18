// Configuration service to fetch runtime configuration from backend
let cachedApiKey: string | null = null;

export const getApiKey = async (): Promise<string> => {
  // Return cached API key if available
  if (cachedApiKey !== null) {
    return cachedApiKey;
  }

  try {
    // Fetch configuration from backend
    const response = await fetch('/api/config');
    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.status}`);
    }
    
    const config = await response.json();
    cachedApiKey = config.apiKey || '';
    
    if (!cachedApiKey) {
      throw new Error('API key not configured on server');
    }
    
    return cachedApiKey;
  } catch (error) {
    console.error('[ConfigService] Failed to fetch API key:', error);
    throw new Error('Failed to fetch API key from server. Please ensure GEMINI_API_KEY is set.');
  }
};

// Clear cached API key (useful for testing or if key changes)
export const clearApiKeyCache = (): void => {
  cachedApiKey = null;
};
