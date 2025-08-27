
import { supabase } from '@/integrations/supabase/client';

export interface VoiceSettings {
  voice?: string;
  speed?: number;
  project_id?: string;
  real_time?: boolean;
}

export interface AdvancedSpeechResponse {
  audioContent?: string;
  job_id?: string;
  message?: string;
  success?: boolean;
  error?: string;
  wordCount?: number;
  creditsRemaining?: number;
}

class APIService {
  async generateAdvancedSpeech(text: string, settings: VoiceSettings): Promise<AdvancedSpeechResponse | null> {
    try {
      console.log('Generating advanced speech:', { text: text.substring(0, 100), settings });

      const { data, error } = await supabase.functions.invoke('text-to-speech-enhanced', {
        body: {
          text,
          voice_settings: {
            voice: settings.voice || 'alloy',
            speed: settings.speed || 1.0
          },
          project_id: settings.project_id,
          real_time: settings.real_time || false
        }
      });

      if (error) {
        console.error('API Error:', error);
        throw new Error(error.message || 'Failed to generate speech');
      }

      if (!data || !data.success) {
        console.error('API returned error:', data);
        throw new Error(data?.error || 'Speech generation failed');
      }

      console.log('API Response:', data);
      return data;
    } catch (error) {
      console.error('Error in generateAdvancedSpeech:', error);
      throw error;
    }
  }

  async generateBasicSpeech(text: string, voice: string = 'alloy'): Promise<string | null> {
    try {
      console.log('Generating basic speech:', { text: text.substring(0, 100), voice });

      const { data, error } = await supabase.functions.invoke('text-to-voice', {
        body: {
          text,
          voice
        }
      });

      if (error) {
        console.error('Basic TTS Error:', error);
        throw new Error(error.message || 'Failed to generate speech');
      }

      // Convert array buffer to base64
      if (data instanceof ArrayBuffer) {
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(data)));
        return `data:audio/mpeg;base64,${base64Audio}`;
      }

      return data;
    } catch (error) {
      console.error('Error in generateBasicSpeech:', error);
      throw error;
    }
  }

  async startRealtimeProcessing(text: string, settings: VoiceSettings): Promise<any> {
    try {
      console.log('Starting realtime processing:', { text: text.substring(0, 100), settings });

      const { data, error } = await supabase.functions.invoke('realtime-voice-processing', {
        body: {
          text,
          voice_settings: settings,
          project_id: settings.project_id
        }
      });

      if (error) {
        console.error('Realtime Processing Error:', error);
        throw new Error(error.message || 'Failed to start processing');
      }

      return data;
    } catch (error) {
      console.error('Error in startRealtimeProcessing:', error);
      throw error;
    }
  }
}

export const apiService = new APIService();
