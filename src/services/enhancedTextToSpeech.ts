
import { supabase } from '@/integrations/supabase/client';

export interface VoiceSettings {
  speed: number;
  pitch: number;
  volume: number;
  voice?: string;
}

export interface TextToSpeechRequest {
  text: string;
  voice_settings: VoiceSettings;
  language?: string;
}

export class EnhancedTextToSpeechService {
  static async generateSpeech(request: TextToSpeechRequest, userId: string): Promise<string | null> {
    try {
      console.log('Generating speech with enhanced service:', request);

      const { data, error } = await supabase.functions.invoke('text-to-speech-enhanced', {
        body: {
          text: request.text,
          voice_settings: request.voice_settings,
          language: request.language || 'en-US',
          user_id: userId
        }
      });

      if (error) {
        console.error('Enhanced TTS error:', error);
        throw error;
      }

      return data?.audio_url || null;
    } catch (error) {
      console.error('Enhanced TTS service error:', error);
      return null;
    }
  }

  static async getAvailableVoices(): Promise<Array<{id: string, name: string, language: string}>> {
    // Return a list of available voices
    return [
      { id: 'en-US-standard-A', name: 'English (US) - Standard A', language: 'en-US' },
      { id: 'en-US-standard-B', name: 'English (US) - Standard B', language: 'en-US' },
      { id: 'en-GB-standard-A', name: 'English (UK) - Standard A', language: 'en-GB' },
      { id: 'es-ES-standard-A', name: 'Spanish (Spain) - Standard A', language: 'es-ES' },
      { id: 'fr-FR-standard-A', name: 'French (France) - Standard A', language: 'fr-FR' },
    ];
  }
}
