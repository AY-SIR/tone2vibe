import { supabase } from '@/integrations/supabase/client';

export interface AIVoiceRequest {
  characterName: string;
  description: string;
  tone: string;
  accent?: string;
  gender?: string;
  age?: string;
}

export interface AIVoiceResponse {
  success: boolean;
  voiceId?: string;
  audioUrl?: string;
  message?: string;
  error?: string;
}

export class AIVoiceService {
  
  static async generateVoice(request: AIVoiceRequest, userId: string): Promise<AIVoiceResponse> {
    try {
      const { characterName, description, tone, accent, gender, age } = request;
      
      // Validate inputs
      if (!characterName || !description || !tone) {
        return {
          success: false,
          error: 'Missing required parameters: characterName, description, and tone are required'
        };
      }

      if (!userId) {
        return {
          success: false,
          error: 'User authentication required'
        };
      }

      console.log('Generating AI voice for:', { characterName, description, tone, accent, gender, age });

      // Create AI voice generation prompt
      const prompt = `Create a voice for character "${characterName}" with these characteristics:
        Description: ${description}
        Tone: ${tone}
        ${accent ? `Accent: ${accent}` : ''}
        ${gender ? `Gender: ${gender}` : ''}
        ${age ? `Age: ${age}` : ''}
        
        Generate a unique voice that matches these characteristics.`;

      // Simulate AI processing (replace with actual AI service call)
      console.log('AI Prompt:', prompt);
      
      // Generate a summary for the AI voice
      const aiSummary = `AI-generated ${gender || 'voice'} with ${tone} tone for character ${characterName}. ${description}`;
      
      // Create a unique voice ID
      const voiceId = `ai_voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Determine plan to compute retention
      const { data: profile } = await supabase.from('profiles').select('plan').eq('user_id', userId).single();
      const planAtCreation = (profile as any)?.plan || 'free';
      const retentionDays = planAtCreation === 'premium' ? 90 : planAtCreation === 'pro' ? 30 : 7;
      const retentionExpiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

      // Store the voice data in history table with retention
      const { data, error } = await supabase
        .from('history')
        .insert({
          title: characterName,
          original_text: `AI Generated Voice: ${characterName}`,
          language: 'en-US',
          user_id: userId,
          words_used: 0,
          voice_settings: { 
            type: 'ai_generated', 
            summary: aiSummary,
            voice_id: voiceId,
            tone,
            accent,
            gender,
            age,
            description
          },
          plan_at_creation: planAtCreation,
          retention_expires_at: retentionExpiresAt
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing AI voice:', error);
        return {
          success: false,
          error: 'Failed to save AI voice configuration'
        };
      }

      // Real AI voice generation using Supabase edge function
      const audioUrl = await AIVoiceService.generateVoiceWithEdgeFunction(request, userId);

      return {
        success: true,
        voiceId,
        audioUrl,
        message: `Successfully generated AI voice for ${characterName}`
      };

    } catch (error) {
      console.error('AI voice generation error:', error);
      return {
        success: false,
        error: 'Internal server error during AI voice generation'
      };
    }
  }

  static async getAIVoices(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', userId)
        .contains('voice_settings', { type: 'ai_generated' })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching AI voices:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAIVoices:', error);
      return [];
    }
  }

  static async deleteAIVoice(voiceId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('history')
        .delete()
        .eq('user_id', userId)
        .contains('voice_settings', { voice_id: voiceId });

      if (error) {
        console.error('Error deleting AI voice:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteAIVoice:', error);
      return false;
    }
  }

  static async cloneVoice(audioFile: File, voiceName: string, userId: string): Promise<AIVoiceResponse> {
    try {
      if (!audioFile || !voiceName || !userId) {
        return {
          success: false,
          error: 'Missing required parameters for voice cloning'
        };
      }

      console.log('Cloning voice from audio file:', voiceName);

      // Generate a unique voice ID
      const voiceId = `cloned_voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Determine plan to compute retention
      const { data: profile } = await supabase.from('profiles').select('plan').eq('user_id', userId).single();
      const planAtCreation = (profile as any)?.plan || 'free';
      const retentionDays = planAtCreation === 'premium' ? 90 : planAtCreation === 'pro' ? 30 : 7;
      const retentionExpiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

      // Store the cloned voice data in history table with retention
      const { data, error } = await supabase
        .from('history')
        .insert({
          title: voiceName,
          original_text: `Voice Clone: ${voiceName}`,
          language: 'en-US',
          user_id: userId,
          words_used: 0,
          voice_settings: { 
            type: 'cloned',
            voice_id: voiceId,
            original_name: voiceName,
            file_size: audioFile.size,
            file_type: audioFile.type
          },
          plan_at_creation: planAtCreation,
          retention_expires_at: retentionExpiresAt
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing cloned voice:', error);
        return {
          success: false,
          error: 'Failed to save cloned voice configuration'
        };
      }

      return {
        success: true,
        voiceId,
        message: `Successfully cloned voice: ${voiceName}`
      };

    } catch (error) {
      console.error('Voice cloning error:', error);
      return {
        success: false,
        error: 'Internal server error during voice cloning'
      };
    }
  }

  private static async generateVoiceWithEdgeFunction(request: AIVoiceRequest, userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-voice', {
        body: {
          text: `Voice generation for ${request.characterName}`,
          voice_settings: {
            voice: 'alloy',
            speed: 1.0,
            pitch: 0,
            volume: 1.0
          }
        }
      });

      if (error) throw error;
      return data?.audio_url || null;
    } catch (error) {
      console.error('Edge function voice generation error:', error);
      return null;
    }
  }
}