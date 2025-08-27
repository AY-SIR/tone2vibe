
import { supabase } from '@/integrations/supabase/client';

export interface ProjectData {
  id?: string;
  title: string;
  language: string;
  original_text: string;
  word_count: number;
  voice_settings?: any;
  audio_url?: string;
  audio_file_path?: string;
  audio_file_size?: number;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export class ProjectService {
  // Create a new project
  static async createProject(projectData: Omit<ProjectData, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
    try {
      console.log('Creating project:', projectData);
      
      const { data, error } = await supabase
        .from('history')
        .insert({
          title: projectData.title,
          language: projectData.language,
          original_text: projectData.original_text,
          words_used: projectData.word_count,
          voice_settings: projectData.voice_settings || {},
          audio_url: projectData.audio_url,
          user_id: projectData.user_id
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating project:', error);
        return null;
      }

      console.log('Project created successfully:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error in createProject:', error);
      return null;
    }
  }

  // Get user projects
  static async getUserProjects(userId: string): Promise<ProjectData[]> {
    try {
      console.log('Fetching projects for user:', userId);
      
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        return [];
      }

      // Map history data to ProjectData format
      return (data || []).map(item => ({
        id: item.id,
        title: item.title,
        language: item.language,
        original_text: item.original_text,
        word_count: item.words_used,
        voice_settings: item.voice_settings,
        audio_url: item.audio_url,
        user_id: item.user_id,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));
    } catch (error) {
      console.error('Error in getUserProjects:', error);
      return [];
    }
  }

  // Update project
  static async updateProject(projectId: string, updates: Partial<ProjectData>): Promise<boolean> {
    try {
      console.log('Updating project:', projectId, updates);
      
      const { error } = await supabase
        .from('history')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) {
        console.error('Error updating project:', error);
        return false;
      }

      console.log('Project updated successfully');
      return true;
    } catch (error) {
      console.error('Error in updateProject:', error);
      return false;
    }
  }

  // Delete project
  static async deleteProject(projectId: string): Promise<boolean> {
    try {
      console.log('Deleting project:', projectId);
      
      const { error } = await supabase
        .from('history')
        .delete()
        .eq('id', projectId);

      if (error) {
        console.error('Error deleting project:', error);
        return false;
      }

      console.log('Project deleted successfully');
      return true;
    } catch (error) {
      console.error('Error in deleteProject:', error);
      return false;
    }
  }

  // Duplicate project (for creating new project from history)
  static async duplicateProject(originalProjectId: string, userId: string): Promise<string | null> {
    try {
      console.log('Duplicating project:', originalProjectId);
      
      // First get the original project
      const { data: originalProject, error: fetchError } = await supabase
        .from('history')
        .select('*')
        .eq('id', originalProjectId)
        .single();

      if (fetchError || !originalProject) {
        console.error('Error fetching original project:', fetchError);
        return null;
      }

      // Create new project with same data but new ID and timestamps
      const newProjectData = {
        title: `${originalProject.title} (Copy)`,
        language: originalProject.language,
        original_text: originalProject.original_text,
        word_count: originalProject.words_used,
        voice_settings: originalProject.voice_settings,
        user_id: userId
      };

      return await this.createProject(newProjectData);
    } catch (error) {
      console.error('Error in duplicateProject:', error);
      return null;
    }
  }
}
