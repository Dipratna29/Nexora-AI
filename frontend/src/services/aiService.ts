/**
 * TrustTrip AI Assistant Service
 * Securely communicates with the Flask backend (/api/ai/chat)
 * Powered by Groq API.
 * NO Groq API keys are stored in the frontend.
 */

import api from '../config/api';
import { getFriendlyErrorMessage } from '../utils/apiError';

export interface AIChatRequest {
  message: string;
  conversation_id?: string;
  location?: {
    latitude: number;
    longitude: number;
  } | null;
  user_id?: string;
}

export interface AIChatResponse {
  success: boolean;
  message: string;
  conversation_id?: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error_code?: string;
}

export interface AIStatusResponse {
  success: boolean;
  online: boolean;
  model: string;
  groq_configured: boolean;
}

/**
 * Send a chat query to TrustTrip AI through the Flask backend.
 */
export const sendChatMessage = async (params: AIChatRequest): Promise<AIChatResponse> => {
  try {
    const response = await api.post<AIChatResponse>('/api/ai/chat', {
      message: params.message.trim(),
      conversation_id: params.conversation_id,
      location: params.location || undefined,
      user_id: params.user_id,
    }, {
      timeout: 25000,
    });

    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 429) {
      return {
        success: false,
        message: 'AI Assistant is currently busy. Please wait a moment before sending another message.',
        error_code: 'RATE_LIMIT_EXCEEDED',
      };
    }

    if (error?.response?.data?.message) {
      return {
        success: false,
        message: error.response.data.message,
        error_code: error.response.data.error_code || 'API_ERROR',
      };
    }

    const friendly = getFriendlyErrorMessage(error, 'Unable to connect to TrustTrip AI. Check your connection and try again.');
    return {
      success: false,
      message: friendly,
      error_code: 'NETWORK_ERROR',
    };
  }
};

/**
 * Clear the conversation history for a session.
 */
export const clearConversation = async (conversationId: string): Promise<boolean> => {
  try {
    const response = await api.post('/api/ai/clear', { conversation_id: conversationId });
    return !!response.data?.success;
  } catch {
    return false;
  }
};

/**
 * Fetch AI service health and operational status.
 */
export const getAIStatus = async (): Promise<AIStatusResponse | null> => {
  try {
    const response = await api.get<AIStatusResponse>('/api/ai/status');
    return response.data;
  } catch {
    return null;
  }
};
