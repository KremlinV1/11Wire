/**
 * ElevenLabs API Service
 * 
 * This service integrates with the ElevenLabs API to manage voice agents and scripts
 * API documentation: https://docs.elevenlabs.io/api-reference/text-to-speech
 */

// Default API base URL
const API_BASE_URL = 'https://api.elevenlabs.io/v1';

/**
 * Get API key from the application settings/configuration
 * In a real implementation, this would be stored securely and
 * potentially fetched from a backend proxy to avoid exposing in frontend
 */
const getApiKey = () => {
  // For development, could use localStorage, but in production
  // this should be secured and not exposed in frontend code
  return localStorage.getItem('elevenLabsApiKey') || '';
};

/**
 * Headers with authentication
 */
const getAuthHeaders = () => {
  const apiKey = getApiKey();
  return {
    'Content-Type': 'application/json',
    'xi-api-key': apiKey,
  };
};

/**
 * Fetch all available voices from ElevenLabs
 */
export const getVoices = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/voices`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();
    return data.voices;
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    throw error;
  }
};

/**
 * Get details for a specific voice
 */
export const getVoice = async (voiceId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/voices/${voiceId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching voice details for ID ${voiceId}:`, error);
    throw error;
  }
};

/**
 * Generate speech from text using a specific voice
 */
export const textToSpeech = async (voiceId, text, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        text,
        model_id: options.modelId || 'eleven_monolingual_v1',
        voice_settings: options.voiceSettings || {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    // Returns audio blob that can be played or downloaded
    return await response.blob();
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
  }
};

/**
 * Get available scripts for a voice agent
 * Note: This is a placeholder for ElevenLabs script management
 * or custom integration with 11Wire backend
 */
export const getScriptsForAgent = async (agentId) => {
  try {
    // In a real implementation, this would call:
    // 1. ElevenLabs script API if they provide one, or
    // 2. Your own backend that manages scripts for voice agents
    
    // For now, simulating with a delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock data - would be replaced with actual API call
    const scripts = [
      {
        id: `scr_${agentId}_001`,
        name: 'Introduction Script',
        content: 'Hello, my name is [Agent Name] calling on behalf of [Company Name]. How are you doing today?',
        lastModified: '2025-06-20T14:30:00',
        usageCount: 45,
      },
      {
        id: `scr_${agentId}_002`,
        name: 'Product Offering',
        content: 'I wanted to let you know about our new [Product Name] that helps [Main Benefit]. Many of our customers have seen [Result] after using it.',
        lastModified: '2025-06-22T09:15:00',
        usageCount: 32,
      },
      {
        id: `scr_${agentId}_003`,
        name: 'Objection Handling',
        content: 'I understand your concern about [Objection]. Many customers initially felt the same way, but they found that [Resolution].',
        lastModified: '2025-06-23T11:45:00',
        usageCount: 28,
      }
    ];
    
    return scripts;
  } catch (error) {
    console.error(`Error fetching scripts for agent ${agentId}:`, error);
    throw error;
  }
};

/**
 * Test if the API key is valid
 */
export const testApiConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/user/subscription`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error testing ElevenLabs API connection:', error);
    return false;
  }
};

export default {
  getVoices,
  getVoice,
  textToSpeech,
  getScriptsForAgent,
  testApiConnection,
};
