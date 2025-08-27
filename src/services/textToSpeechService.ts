
import { supabase } from '@/integrations/supabase/client';
import { apiService } from './apiService';

export interface TTSOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  language?: string;
  quality?: 'standard' | 'premium';
  emotion?: string;
  accent?: string;
  style?: string;
}

export interface TTSResult {
  audioUrl: string;
  duration?: number;
  wordCount: number;
}

export class TextToSpeechService {
  // Generate speech using advanced TTS service
  static async generateSpeech(text: string, options: TTSOptions = {}): Promise<TTSResult | null> {
    try {
      console.log('Generating speech with options:', { textLength: text.length, options });
      
      // Use the generate-voice edge function which properly deducts words
      const { data, error } = await supabase.functions.invoke('generate-voice', {
        body: {
          text: text,
          voice_settings: {
            voice: options.voice || 'alloy',
            speed: options.speed || 1.0,
            pitch: options.pitch || 1.0,
            emotion: options.emotion || 'neutral',
            accent: options.accent || 'default',
            style: options.style || 'natural'
          },
          language: options.language || 'en-US'
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        // Make error messages user-friendly
        if (error.message?.includes('Insufficient word balance')) {
          throw new Error('You don\'t have enough words left. Please buy more words or upgrade your plan.');
        }
        if (error.message?.includes('User not authenticated')) {
          throw new Error('Please sign in to generate audio.');
        }
        throw new Error('Unable to create your audio right now. Please try again in a moment.');
      }

      if (!data || !data.audioContent) {
        console.error('No audio content in response:', data);
        throw new Error('Failed to generate speech - no audio content received');
      }

      console.log('Speech generation successful, words used:', data.wordsUsed);

      // Convert base64 audio to blob URL
      const audioBlob = this.base64ToBlob(data.audioContent, 'audio/mpeg');
      const audioUrl = URL.createObjectURL(audioBlob);
      
      return {
        audioUrl,
        wordCount: data.wordsUsed || this.countWords(text)
      };
    } catch (error) {
      console.error('Speech generation failed:', error);
      return null;
    }
  }

  // Generate speech with custom voice
  static async generateWithCustomVoice(
    text: string, 
    voiceId: string, 
    voiceType: 'user' | 'prebuilt',
    options: TTSOptions = {}
  ): Promise<TTSResult | null> {
    try {
      console.log('Generating speech with custom voice:', { voiceId, voiceType });
      
      // For now, use the standard generation with voice parameter
      // In a real implementation, this would handle custom voice processing
      return await this.generateSpeech(text, {
        ...options,
        voice: voiceId
      });
    } catch (error) {
      console.error('Custom voice generation failed:', error);
      return null;
    }
  }

  // Convert base64 to blob
  private static base64ToBlob(base64: string, mimeType: string): Blob {
    try {
      if (!base64) {
        throw new Error('No base64 data provided');
      }
      
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: mimeType });
    } catch (error) {
      console.error('Error converting base64 to blob:', error);
      throw new Error('Failed to convert audio data');
    }
  }

  // Count words in text
  private static countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  // Get available voices
  static async getAvailableVoices(): Promise<{id: string, name: string, language: string}[]> {
    // Return standard voices - in production this would come from the API
    return [
      { id: 'alloy', name: 'Alloy', language: 'en-US' },
      { id: 'echo', name: 'Echo', language: 'en-US' },
      { id: 'fable', name: 'Fable', language: 'en-US' },
      { id: 'onyx', name: 'Onyx', language: 'en-US' },
      { id: 'nova', name: 'Nova', language: 'en-US' },
      { id: 'shimmer', name: 'Shimmer', language: 'en-US' }
    ];
  }

  // Cleanup audio URLs to prevent memory leaks
  static cleanupAudioUrl(url: string): void {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}
