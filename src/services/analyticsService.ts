import { supabase } from '@/integrations/supabase/client';

export interface AnalyticsData {
  totalProjects: number;
  totalWords: number;
  languageBreakdown: Array<{
    language: string;
    count: number;
    words: number;
  }>;
  monthlyUsage: Array<{
    month: string;
    words: number;
    projects: number;
  }>;
  voiceTypeUsage: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

export interface ProAnalytics {
  totalProjects: number;
  totalWordsProcessed: number;
  wordsRemaining: number;
  totalAudioGenerated: number;
  recentActivity: Array<{
    date: string;
    words: number;
    projects: number;
  }>;
  languageUsage: Array<{
    language: string;
    count: number;
    percentage: number;
  }>;
  planInfo: {
    plan: string;
    wordsUsed: number;
    wordsLimit: number;
    planExpiry: string | null;
  };
}

export interface PremiumAnalytics extends ProAnalytics {
  weeklyTrends: Array<{
    week: string;
    words: number;
    projects: number;
    growth: number;
  }>;
  performanceInsights: {
    efficiencyScore: number;
    avgProcessingTime: number;
    peakUsageHours: string[];
  };
}

export interface DetailedAnalytics {
  id: string;
  user_id: string;
  project_id?: string;
  language: string;
  input_words: number;
  output_words: number;
  voice_type: string;
  voice_id?: string;
  response_time_ms: number;
  created_at: string;
}

export class AnalyticsService {
  static async getUserAnalytics(userId: string, plan?: string): Promise<ProAnalytics | PremiumAnalytics> {
    try {
      console.log('Fetching analytics for user:', userId, 'plan:', plan);
      
      // Fetch project data from history table, excluding samples
      const { data: projects, error: projectsError } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', userId)
        .not('voice_settings', 'cs', '{"type":"voice_sample"}')
        .not('voice_settings', 'cs', '{"isSample":true}')
        .order('created_at', { ascending: false });

      if (projectsError) {
        console.error('Projects fetch error:', projectsError);
        throw projectsError;
      }

      // Fetch profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw profileError;
      }

      const projectsArray = projects || [];
      console.log('Found projects:', projectsArray.length);

      // Calculate basic stats using new word system
      const totalProjects = projectsArray.length;
      const totalWordsProcessed = profile?.plan_words_used || 0; // Use plan_words_used for analytics
      const planWordsRemaining = Math.max(0, (profile?.words_limit || 1000) - totalWordsProcessed);
      
      // Always include purchased words in remaining calculation
      const purchasedWords = profile?.word_balance || 0;
      const wordsRemaining = planWordsRemaining + purchasedWords; // Total available
      
      console.log('Word calculation:', {
        totalWordsProcessed,
        planWordsRemaining,
        purchasedWords,
        wordsRemaining,
        planWordsUsed: profile?.plan_words_used,
        wordsLimit: profile?.words_limit
      });
      const totalAudioGenerated = projectsArray.length;

      // Recent activity (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentProjects = projectsArray.filter(p => new Date(p.created_at) >= thirtyDaysAgo);
      const activityMap = new Map<string, { words: number; projects: number }>();
      
      recentProjects.forEach(project => {
        const date = new Date(project.created_at).toISOString().split('T')[0];
        const existing = activityMap.get(date) || { words: 0, projects: 0 };
        activityMap.set(date, {
          words: existing.words + (project.words_used || 0),
          projects: existing.projects + 1
        });
      });

      const recentActivity = Array.from(activityMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Language usage from history
      const languageMap = new Map<string, number>();
      projectsArray.forEach(project => {
        const lang = this.formatLanguageCode(project.language || 'en-US');
        languageMap.set(lang, (languageMap.get(lang) || 0) + 1);
      });

      const totalLanguageUsage = Array.from(languageMap.values()).reduce((sum, count) => sum + count, 0);
      const languageUsage = Array.from(languageMap.entries()).map(([language, count]) => ({
        language,
        count,
        percentage: totalLanguageUsage > 0 ? Math.round((count / totalLanguageUsage) * 100) : 0
      }));

      // Ensure we have analytics data
      console.log('Analytics data:', {
        totalProjects,
        totalWordsProcessed,
        languageUsage: languageUsage.length,
        recentActivity: recentActivity.length
      });

      const baseAnalytics: ProAnalytics = {
        totalProjects,
        totalWordsProcessed,
        wordsRemaining,
        totalAudioGenerated,
        recentActivity,
        languageUsage,
        planInfo: {
          plan: profile?.plan || 'free',
          wordsUsed: profile?.plan_words_used || 0, // Use plan_words_used
          wordsLimit: profile?.words_limit || 1000,
          planExpiry: profile?.plan_expires_at || null
        }
      };

      // Return premium analytics if user has premium plan
      if (plan === 'premium') {
        const premiumAnalytics: PremiumAnalytics = {
          ...baseAnalytics,
          weeklyTrends: this.generateWeeklyTrends(projectsArray),
          performanceInsights: {
            efficiencyScore: 85, // Default since we don't have performance data
            avgProcessingTime: 1200,
            peakUsageHours: this.calculatePeakUsageHours(projectsArray)
          }
        };
        return premiumAnalytics;
      }

      return baseAnalytics;

    } catch (error) {
      console.error('Error fetching analytics:', error);
      const fallback: ProAnalytics = {
        totalProjects: 0,
        totalWordsProcessed: 0,
        wordsRemaining: 1000,
        totalAudioGenerated: 0,
        recentActivity: [],
        languageUsage: [],
        planInfo: {
          plan: 'free',
          wordsUsed: 0, // This will be plan_words_used
          wordsLimit: 1000,
          planExpiry: null
        }
      };
      return fallback;
    }
  }

  private static generateWeeklyTrends(projects: any[]): Array<{ week: string; words: number; projects: number; growth: number }> {
    const weeklyMap = new Map<string, { words: number; projects: number }>();
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    projects.filter(p => new Date(p.created_at) >= twelveWeeksAgo).forEach(project => {
      const date = new Date(project.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      const existing = weeklyMap.get(weekKey) || { words: 0, projects: 0 };
      weeklyMap.set(weekKey, {
        words: existing.words + (project.words_used || 0),
        projects: existing.projects + 1
      });
    });

    const trends = Array.from(weeklyMap.entries())
      .map(([week, data]) => ({ week, ...data, growth: 0 }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // Calculate growth percentages
    for (let i = 1; i < trends.length; i++) {
      const prev = trends[i - 1];
      const curr = trends[i];
      curr.growth = prev.words > 0 ? Math.round(((curr.words - prev.words) / prev.words) * 100) : 0;
    }

    return trends;
  }

  private static calculatePeakUsageHours(projects: any[]): string[] {
    const hourMap = new Map<number, number>();
    
    projects.forEach(project => {
      const hour = new Date(project.created_at).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });
    
    const sortedHours = Array.from(hourMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => `${hour.toString().padStart(2, '0')}:00`);
    
    return sortedHours.length > 0 ? sortedHours : ['10:00', '14:00', '18:00'];
  }

  static async getDetailedAnalytics(userId: string): Promise<DetailedAnalytics[]> {
    try {
      // Use history table as fallback for detailed analytics
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('Detailed analytics not available:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        project_id: null,
        language: item.language,
        input_words: item.words_used || 0,
        output_words: item.words_used || 0,
        voice_type: 'generated',
        response_time_ms: 1200,
        created_at: item.created_at
      }));

    } catch (error) {
      console.error('Error fetching detailed analytics:', error);
      return [];
    }
  }

  static async recordAnalytics(userId: string, data: {
    language: string;
    inputWords: number;
    outputWords: number;
    voiceType: string;
    voiceId?: string;
    responseTime?: number;
    projectTitle?: string;
  }): Promise<void> {
    try {
      // Just log analytics for now - don't save to history table to avoid duplicates
      console.log('Analytics recorded:', {
        userId,
        ...data,
        timestamp: new Date().toISOString()
      });
      
      // TODO: If you need to store analytics separately, create an analytics table
      // This prevents duplicate entries in history table
    } catch (error) {
      console.error('Error recording analytics:', error);
    }
  }

  static async trackActivity(userId: string, activityType: string, metadata?: any): Promise<void> {
    try {
      // Only track analytics for full voice generations, not samples
      if (activityType === 'audio_generated' && metadata?.isSample) {
        console.log('Skipping analytics for sample generation');
        return;
      }

      console.log(`Tracking activity: ${activityType} for user ${userId}`, metadata);
      
      // Only track analytics - word deduction happens in generation process
      console.log(`Tracking ${metadata?.words || 0} words usage for analytics only`);
      
      await this.recordAnalytics(userId, {
        language: metadata?.language || 'en-US',
        inputWords: metadata?.words || 0,
        outputWords: metadata?.words || 0,
        voiceType: activityType,
        responseTime: metadata?.responseTime || 0,
        projectTitle: metadata?.title || `${activityType}_${Date.now()}`
      });
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  }

  static formatLanguageCode(code: string): string {
    const languageNames: Record<string, string> = {
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'es-ES': 'Spanish',
      'fr-FR': 'French',
      'de-DE': 'German',
      'it-IT': 'Italian',
      'pt-BR': 'Portuguese',
      'ja-JP': 'Japanese',
      'ko-KR': 'Korean',
      'zh-CN': 'Chinese',
      'hi-IN': 'Hindi',
      'ar-SA': 'Arabic'
    };
    return languageNames[code] || code;
  }
}