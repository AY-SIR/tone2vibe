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

  /** ------------------------------
   *  Fetch analytics for Pro/Premium only
   * ------------------------------- */
  static async getUserAnalytics(userId: string, plan?: string): Promise<ProAnalytics | PremiumAnalytics | null> {
    // Skip analytics for free users
    if (!plan || (plan !== 'pro' && plan !== 'premium')) {
      console.log('Analytics not available for free users');
      return null;
    }

    try {
      // Fetch project data
      const { data: projects, error: projectsError } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', userId)
        .not('voice_settings', 'cs', '{"type":"voice_sample"}')
        .not('voice_settings', 'cs', '{"isSample":true}')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      const projectsArray = projects || [];

      // Calculate basic stats
      const totalProjects = projectsArray.length;
      const totalWordsProcessed = profile?.plan_words_used || 0;
      const planWordsRemaining = Math.max(0, (profile?.words_limit || 1000) - totalWordsProcessed);
      const purchasedWords = profile?.word_balance || 0;
      const wordsRemaining = planWordsRemaining + purchasedWords;
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

      // Language usage
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

      const baseAnalytics: ProAnalytics = {
        totalProjects,
        totalWordsProcessed,
        wordsRemaining,
        totalAudioGenerated,
        recentActivity,
        languageUsage,
        planInfo: {
          plan: profile?.plan || 'free',
          wordsUsed: profile?.plan_words_used || 0,
          wordsLimit: profile?.words_limit || 1000,
          planExpiry: profile?.plan_expires_at || null
        }
      };

      // Premium users get extra insights
      if (plan === 'premium') {
        const premiumAnalytics: PremiumAnalytics = {
          ...baseAnalytics,
          weeklyTrends: this.generateWeeklyTrends(projectsArray),
          performanceInsights: {
            efficiencyScore: 85, // placeholder
            avgProcessingTime: 1200,
            peakUsageHours: this.calculatePeakUsageHours(projectsArray)
          }
        };
        return premiumAnalytics;
      }

      return baseAnalytics;

    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }

  /** ------------------------------
   *  Generate weekly trends
   * ------------------------------- */
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

    for (let i = 1; i < trends.length; i++) {
      const prev = trends[i - 1];
      const curr = trends[i];
      curr.growth = prev.words > 0 ? Math.round(((curr.words - prev.words) / prev.words) * 100) : 0;
    }

    return trends;
  }

  /** ------------------------------
   *  Calculate peak usage hours
   * ------------------------------- */
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

  /** ------------------------------
   *  Get detailed analytics for Pro/Premium only
   * ------------------------------- */
  static async getDetailedAnalytics(userId: string, plan?: string): Promise<DetailedAnalytics[] | null> {
    if (!plan || (plan !== 'pro' && plan !== 'premium')) return null;

    try {
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

  /** ------------------------------
   *  Record analytics (Pro/Premium only)
   * ------------------------------- */
  static async recordAnalytics(userId: string, data: {
    language: string;
    inputWords: number;
    outputWords: number;
    voiceType: string;
    voiceId?: string;
    responseTime?: number;
    projectTitle?: string;
  }, plan?: string): Promise<void> {
    if (!plan || (plan !== 'pro' && plan !== 'premium')) return;

    try {
      console.log('Analytics recorded:', {
        userId,
        ...data,
        timestamp: new Date().toISOString()
      });
      // TODO: store in analytics table if needed
    } catch (error) {
      console.error('Error recording analytics:', error);
    }
  }

  /** ------------------------------
   *  Track activity for Pro/Premium only
   * ------------------------------- */
  static async trackActivity(userId: string, activityType: string, metadata?: any, plan?: string): Promise<void> {
    if (!plan || (plan !== 'pro' && plan !== 'premium')) {
      console.log('Skipping analytics tracking for free users');
      return;
    }

    if (activityType === 'audio_generated' && metadata?.isSample) {
      console.log('Skipping analytics for sample generation');
      return;
    }

    await this.recordAnalytics(userId, {
      language: metadata?.language || 'en-US',
      inputWords: metadata?.words || 0,
      outputWords: metadata?.words || 0,
      voiceType: activityType,
      responseTime: metadata?.responseTime || 0,
      projectTitle: metadata?.title || `${activityType}_${Date.now()}`
    }, plan);
  }

  /** ------------------------------
   *  Map language codes to human-readable names
   * ------------------------------- */
  static formatLanguageCode(code: string): string {
    const languageNames: Record<string, string> = {
      'ar-SA': 'Arabic (Saudi Arabia)',
      'as-IN': 'Assamese',
      'bg-BG': 'Bulgarian',
      'bn-BD': 'Bengali (Bangladesh)',
      'bn-IN': 'Bengali (India)',
      'cs-CZ': 'Czech',
      'da-DK': 'Danish',
      'nl-NL': 'Dutch',
      'en-GB': 'English (UK)',
      'en-US': 'English (US)',
      'fi-FI': 'Finnish',
      'fr-CA': 'French (Canada)',
      'fr-FR': 'French (France)',
      'de-DE': 'German',
      'el-GR': 'Greek',
      'gu-IN': 'Gujarati',
      'he-IL': 'Hebrew',
      'hi-IN': 'Hindi',
      'hr-HR': 'Croatian',
      'id-ID': 'Indonesian',
      'it-IT': 'Italian',
      'ja-JP': 'Japanese',
      'kn-IN': 'Kannada',
      'ko-KR': 'Korean',
      'lt-LT': 'Lithuanian',
      'ms-MY': 'Malay',
      'ml-IN': 'Malayalam',
      'mr-IN': 'Marathi',
      'ne-IN': 'Nepali (India)',
      'no-NO': 'Norwegian',
      'or-IN': 'Odia',
      'pa-IN': 'Punjabi',
      'fa-IR': 'Persian (Farsi)',
      'pt-BR': 'Portuguese (Brazil)',
      'pt-PT': 'Portuguese (Portugal)',
      'ro-RO': 'Romanian',
      'ru-RU': 'Russian',
      'sr-RS': 'Serbian',
      'sk-SK': 'Slovak',
      'sl-SI': 'Slovenian',
      'es-ES': 'Spanish (Spain)',
      'es-MX': 'Spanish (Mexico)',
      'sv-SE': 'Swedish',
      'ta-IN': 'Tamil',
      'te-IN': 'Telugu',
      'th-TH': 'Thai',
      'tr-TR': 'Turkish',
      'uk-UA': 'Ukrainian',
      'ur-IN': 'Urdu (India)',
      'vi-VN': 'Vietnamese',
      'zh-CN': 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)'
    };

    return languageNames[code] || code;
  }
}
