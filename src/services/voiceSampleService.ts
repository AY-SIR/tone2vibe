import { supabase } from '@/integrations/supabase/client';

export interface VoiceSample {
  id: string;
  name: string;
  language: string;
  audio_url?: string;
  created_at: string;
  user_id: string;
}

export class VoiceSampleService {
  
  static async getUserVoiceSamples(userId: string): Promise<VoiceSample[]> {
    try {
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', userId)
        .contains('voice_settings', { type: 'voice_sample' })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching voice samples:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        name: item.title,
        language: item.language,
        audio_url: item.audio_url,
        created_at: item.created_at,
        user_id: item.user_id
      }));
    } catch (error) {
      console.error('Error in getUserVoiceSamples:', error);
      return [];
    }
  }

  static async recordVoiceSample(userId: string, sampleName: string, audioBlob: Blob): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('history')
        .insert({
          user_id: userId,
          title: sampleName,
          original_text: 'Voice Sample Recording',
          language: 'en-US',
          words_used: 0,
          voice_settings: { 
            type: 'voice_sample',
            recording_info: {
              size: audioBlob.size,
              type: audioBlob.type
            }
          }
        });

      return !error;
    } catch (error) {
      console.error('Error in recordVoiceSample:', error);
      return false;
    }
  }

  static async getVoiceSample(sampleId: string, userId: string): Promise<VoiceSample | null> {
    try {
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('id', sampleId)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        name: data.title,
        language: data.language,
        audio_url: data.audio_url,
        created_at: data.created_at,
        user_id: data.user_id
      };
    } catch (error) {
      return null;
    }
  }

  static async deleteVoiceSample(sampleId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('history')
        .delete()
        .eq('id', sampleId)
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      return false;
    }
  }
}