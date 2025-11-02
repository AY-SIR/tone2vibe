
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = "https://msbmyiqhohtjdfbjmxlf.supabase.co";

export interface StoredVoice {
  id: string;
  name: string;
  audio_blob?: string;
  file_path?: string;
  duration: string | null;
  language: string;
  user_id: string;
  created_at: string;
  file_size: number | null;
  custom_name: string | null;
}

export class VoiceStorageService {
  // Get all user voices from Supabase
  static async getUserVoices(userId: string): Promise<StoredVoice[]> {
    try {
      console.log('Fetching user voices for:', userId);
      
    // Use history table as fallback for voice storage
    const { data, error } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', userId)
      .contains('voice_settings', { type: 'voice_storage' })
      .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user voices:', error);
        return [];
      }

      console.log('User voices fetched:', data?.length || 0);
      return (data || []).map(item => ({
        id: item.id,
        name: item.title,
        duration: null,
        language: item.language,
        user_id: item.user_id,
        created_at: item.created_at,
        file_size: null,
        custom_name: null,
        audio_blob: item.audio_url,
        file_path: item.audio_url
      }));
    } catch (error) {
      console.error('Error in getUserVoices:', error);
      return [];
    }
  }

  // Get a specific voice by ID
  static async getVoiceById(voiceId: string): Promise<StoredVoice | null> {
    try {
      console.log('Fetching voice by ID:', voiceId);
      
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('id', voiceId)
        .single();

      if (error) {
        console.error('Error fetching voice by ID:', error);
        return null;
      }

      console.log('Voice fetched by ID:', data);
      return {
        id: data.id,
        name: data.title,
        duration: null,
        language: data.language,
        user_id: data.user_id,
        created_at: data.created_at,
        file_size: null,
        custom_name: null,
        audio_blob: data.audio_url,
        file_path: data.audio_url
      };
    } catch (error) {
      console.error('Error in getVoiceById:', error);
      return null;
    }
  }

  // Store a new voice recording using Supabase Storage
  static async storeVoice(
    userId: string,
    name: string,
    audioBlob: Blob,
    language: string = 'en-US',
    duration?: string
  ): Promise<string | null> {
    try {
      console.log('Storing voice:', { userId, name, language, duration });
      
      // Create a unique file path
      const timestamp = new Date().getTime();
      const fileName = `${userId}/${timestamp}-${name.replace(/[^a-zA-Z0-9]/g, '_')}.wav`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-voices')
        .upload(fileName, audioBlob, {
          contentType: 'audio/wav',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading to storage:', uploadError);
        // Fallback to base64 storage in database
        return this.storeVoiceInDatabase(userId, name, audioBlob, language, duration);
      }

      // Convert blob to base64 for database storage as well (as backup)
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Store metadata in database with both file_path and audio_blob
      const { data, error } = await supabase
        .from('history')
        .insert({
          user_id: userId,
          title: name,
          original_text: 'Voice Storage',
          language: language,
          words_used: 0,
          voice_settings: { 
            type: 'voice_storage',
            file_path: uploadData.path,
            duration,
            file_size: audioBlob.size
          }
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error storing voice metadata:', error);
        // Clean up uploaded file
        await supabase.storage.from('user-voices').remove([fileName]);
        return null;
      }

      console.log('Voice stored successfully:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error in storeVoice:', error);
      return null;
    }
  }

  // Fallback method to store voice in database as base64
  private static async storeVoiceInDatabase(
    userId: string,
    name: string,
    audioBlob: Blob,
    language: string,
    duration?: string
  ): Promise<string | null> {
    try {
      console.log('Storing voice in database as fallback');
      
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const { data, error } = await supabase
        .from('history')
        .insert({
          user_id: userId,
          title: name,
          original_text: 'Voice Storage Fallback',
          language: language,
          words_used: 0,
          voice_settings: { 
            type: 'voice_storage',
            audio_data: base64Audio,
            duration,
            file_size: audioBlob.size
          }
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error storing voice in database:', error);
        return null;
      }

      console.log('Voice stored in database successfully:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error in storeVoiceInDatabase:', error);
      return null;
    }
  }

  // Get audio URL from storage or convert base64
  static async getVoiceAudioUrl(voice: StoredVoice): Promise<string | null> {
    try {
      if (voice.file_path) {
        // Issue token and return stream URL
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;
        const issueRes = await fetch(`${SUPABASE_URL}/functions/v1/issue-audio-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ bucket: 'user-voices', storagePath: voice.file_path, ttlSeconds: 24*3600 })
        });
        const issueJson = await issueRes.json();
        if (!issueRes.ok || !issueJson?.token) return null;
        return `${SUPABASE_URL}/functions/v1/stream-audio?token=${issueJson.token}`;
      } else if (voice.audio_blob) {
        // Convert base64 to blob URL
        const blob = this.base64ToBlob(voice.audio_blob, 'audio/wav');
        return URL.createObjectURL(blob);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting voice audio URL:', error);
      return null;
    }
  }

  // Delete a voice recording
  static async deleteVoice(voiceId: string): Promise<boolean> {
    try {
      console.log('Deleting voice:', voiceId);
      
      // First get the voice to check if it has a file_path
      const voice = await this.getVoiceById(voiceId);
      if (!voice) {
        console.error('Voice not found for deletion');
        return false;
      }

      // Delete from storage if it exists
      if (voice.file_path) {
        const { error: storageError } = await supabase.storage
          .from('user-voices')
          .remove([voice.file_path]);
        
        if (storageError) {
          console.error('Error deleting from storage:', storageError);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('history')
        .delete()
        .eq('id', voiceId);

      if (error) {
        console.error('Error deleting voice from database:', error);
        return false;
      }

      console.log('Voice deleted successfully');
      return true;
    } catch (error) {
      console.error('Error in deleteVoice:', error);
      return false;
    }
  }

  // Convert base64 audio to blob for playback
  static base64ToBlob(base64Audio: string, mimeType: string = 'audio/wav'): Blob {
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Blob([bytes], { type: mimeType });
    } catch (error) {
      console.error('Error converting base64 to blob:', error);
      return new Blob();
    }
  }

  // Get prebuilt voices (these would be stored in a separate table or config)
  static async getPrebuiltVoices(): Promise<any[]> {
    // For now, return static data. In the future, this could come from Supabase
    return [
      { id: 'voice_1', name: 'Professional Male', category: 'professional', language: 'en-US' },
      { id: 'voice_2', name: 'Professional Female', category: 'professional', language: 'en-US' },
      { id: 'voice_3', name: 'Cartoon Character', category: 'cartoon', language: 'en-US' },
      { id: 'voice_4', name: 'Celebrity Style', category: 'celebrity', language: 'en-US' },
    ];
  }
}
