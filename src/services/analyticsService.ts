import { supabase } from '@/integrations/supabase/client';

// --- INTERFACES (Defines the shape of your analytics data) ---
export interface ProAnalytics {
  totalProjects: number;
  totalWordsProcessed: number;
  wordsRemaining: number;
  totalAudioGenerated: number;
  recentActivity: Array<{ date: string; words: number; projects: number }>;
  languageUsage: Array<{ language: string; count: number; percentage: number }>;
  topVoices: Array<{ voice: string; count: number }>;
  avgWordsPerProject: number;
  peakDayOfWeek: string;
  avgProjectTimeMs: number;
  usageStreakDays: number;
  weeklyTrends: Array<{ week: string; words: number; projects: number; growth: number }>;
  planInfo: { plan: string; wordsUsed: number; wordsLimit: number; planExpiry: string | null };
}

export interface PremiumAnalytics extends ProAnalytics {
  monthlyTrends: Array<{ month: string; words: number; projects: number }>;
  hourlyUsage: Array<{ hour: string; words: number }>;
  performanceInsights: {
    efficiencyScore: number;
    avgProcessingTime: number;
    peakUsageHours: string[];
    longestResponseTime: number;
    shortestResponseTime: number;
    errorRate: number;
  };
  last90DaysActivity: Array<{ date: string; words: number; projects: number }>;
}

export interface DetailedAnalytics {
  id: string;
  user_id: string;
  project_id: string;
  language: string;
  input_words: number;
  output_words: number;
  voice_type: string;
  voice_id?: string;
  response_time_ms: number;
  created_at: string;
}

/**
 * A highly optimized service for fetching user analytics.
 */
export class AnalyticsService {
  /**
   * Fetch Pro/Premium analytics summary.
   */
  static async getUserAnalytics(userId: string, plan?: string): Promise<ProAnalytics | PremiumAnalytics | null> {
    if (!plan || (plan !== 'pro' && plan !== 'premium')) return null;

    try {
      // --- Step 1: Fetch profile data ---
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('plan, plan_words_used, words_limit, word_balance, plan_expires_at')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      if (!profile) return null;

      // --- Step 2: Call the database function ---
      const retentionDays = plan === 'premium' ? 90 : 30;
      const { data: summaryRaw, error: rpcError } = await supabase.rpc('get_user_analytics_summary' as any, {
        p_user_id: userId,
        p_retention_days: retentionDays,
      });

      if (rpcError) {
        console.error('Database function error:', rpcError);
        throw rpcError;
      }

      const summary = summaryRaw as any;

      // --- Step 3: Fetch raw data for additional calculations ---
      const { data: rawData, error: rawError } = await supabase
        .from('analytics')
        .select('created_at, extra_info, words_used')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString());

      if (rawError) throw rawError;

      const enrichedData = rawData || [];
      const usageStreakDays = this.calculateUsageStreak(enrichedData);
      const topVoices = this.calculateTopVoices(enrichedData);
      const recentActivity = this.calculateRecentActivity(enrichedData);

      // --- Step 4: Calculate totals ---
      const totalWordsUsed = profile.plan_words_used || 0;
      const totalLimit = (profile.words_limit || 0) + (profile.word_balance || 0);
      const wordsRemaining = Math.max(0, totalLimit - totalWordsUsed);

      // --- FIX: Process weeklyTrends properly ---
      const weeklyTrends = this.formatWeeklyTrends(summary.weeklyTrends || []);

      // --- FIX: Process hourly usage properly for Premium ---
      const hourlyUsage = this.formatHourlyUsage(summary.peakUsageHours || []);

      // --- FIX: Extract peak hours as string array ---
      const peakUsageHours = this.extractPeakHours(summary.peakUsageHours || []);

      const baseAnalytics: ProAnalytics = {
        totalProjects: summary.totalProjects || 0,
        totalWordsProcessed: totalWordsUsed,
        wordsRemaining: wordsRemaining,
        totalAudioGenerated: summary.totalAudioGenerated || 0,
        avgWordsPerProject: Number(summary.avgWordsPerProject?.toFixed(2)) || 0,
        peakDayOfWeek: summary.peakDayOfWeek || 'N/A',
        avgProjectTimeMs: Math.round(summary.avgProjectTimeMs) || 0,
        languageUsage: this.formatLanguageUsage(summary.languageUsage, summary.totalProjects),
        weeklyTrends: weeklyTrends,
        usageStreakDays: usageStreakDays,
        topVoices: topVoices,
        recentActivity: recentActivity,
        planInfo: {
          plan: profile.plan || 'free',
          wordsUsed: totalWordsUsed,
          wordsLimit: totalLimit,
          planExpiry: profile.plan_expires_at || null,
        },
      };

      if (plan === 'premium') {
        const premiumAnalytics: PremiumAnalytics = {
          ...baseAnalytics,
          monthlyTrends: this.formatMonthlyTrends(summary.monthlyTrends || []),
          hourlyUsage: hourlyUsage,
          performanceInsights: {
            avgProcessingTime: Math.round(summary.avgProjectTimeMs) || 0,
            longestResponseTime: summary.longestResponseTime || 0,
            shortestResponseTime: summary.shortestResponseTime === null ? 0 : summary.shortestResponseTime,
            peakUsageHours: peakUsageHours,
            errorRate: summary.errorRate || 0,
            efficiencyScore: this.calculateEfficiencyScore(summary.avgWordsPerProject, summary.avgProjectTimeMs),
          },
          last90DaysActivity: recentActivity,
        };
        return premiumAnalytics;
      }

      return baseAnalytics;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }

  /** Detailed analytics per project */
  static async getDetailedAnalytics(userId: string, plan?: string): Promise<DetailedAnalytics[] | null> {
    if (!plan || (plan !== 'pro' && plan !== 'premium')) return null;
    try {
        const retentionDays = plan === 'premium' ? 90 : 30;
        const retentionDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('analytics')
            .select('id, user_id, history_id, language, words_used, extra_info, created_at')
            .eq('user_id', userId)
            .gte('created_at', retentionDate)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return (data || []).map((item: any) => ({
            id: item.id,
            user_id: item.user_id,
            project_id: item.history_id,
            language: item.language || 'en-US',
            input_words: item.words_used || 0,
            output_words: item.words_used || 0,
            voice_type: (item.extra_info as any)?.voice_type || 'generated',
            voice_id: (item.extra_info as any)?.voice_id,
            response_time_ms: (item.extra_info as any)?.response_time_ms || 0,
            created_at: item.created_at
        }));
    } catch (error) {
        console.error('Error fetching detailed analytics:', error);
        return [];
    }
  }

  // --- PRIVATE HELPER FUNCTIONS ---

  private static formatLanguageUsage(
    langs: any[] | null,
    totalProjects: number
  ): Array<{ language: string; count: number; percentage: number }> {
    if (!langs || !totalProjects) return [];
    return langs.map(lang => ({
      ...lang,
      percentage: Math.round((lang.count / totalProjects) * 100),
    }));
  }

  /**
   * FIX: Properly format weekly trends from database
   */
  private static formatWeeklyTrends(
    trends: any[] | null
  ): Array<{ week: string; words: number; projects: number; growth: number }> {
    if (!trends || trends.length === 0) return [];

    const formatted = trends.map((t, i) => ({
      week: t.week,
      words: Number(t.words) || 0,
      projects: Number(t.projects) || 0,
      growth: 0
    }));

    // Calculate growth
    for (let i = 1; i < formatted.length; i++) {
      const prevWords = formatted[i - 1].words;
      formatted[i].growth = prevWords > 0
        ? Math.round(((formatted[i].words - prevWords) / prevWords) * 100)
        : 0;
    }

    return formatted;
  }

  /**
   * FIX: Format monthly trends from database
   */
  private static formatMonthlyTrends(
    trends: any[] | null
  ): Array<{ month: string; words: number; projects: number }> {
    if (!trends || trends.length === 0) return [];

    return trends.map(t => ({
      month: t.month,
      words: Number(t.words) || 0,
      projects: Number(t.projects) || 0,
    }));
  }

  /**
   * FIX: Format hourly usage from database result
   */
  private static formatHourlyUsage(
    hourlyData: any[] | null
  ): Array<{ hour: string; words: number }> {
    if (!hourlyData || !Array.isArray(hourlyData)) return [];

    return hourlyData.map(item => ({
      hour: item.hour || '00:00',
      words: Number(item.words) || 0
    }));
  }

  /**
   * FIX: Extract top 3 peak hours as string array
   */
  private static extractPeakHours(hourlyData: any[] | null): string[] {
    if (!hourlyData || !Array.isArray(hourlyData)) return [];

    // Sort by words descending and take top 3
    const sorted = [...hourlyData]
      .sort((a, b) => (Number(b.words) || 0) - (Number(a.words) || 0))
      .slice(0, 3);

    return sorted.map(item => item.hour || '00:00');
  }

  private static calculateUsageStreak(data: any[]): number {
    if (data.length < 2) return data.length;
    const sortedDates = [...new Set(data.map(d => new Date(d.created_at).toISOString().split('T')[0]))].sort();
    let maxStreak = 1, currentStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i-1]);
        const curr = new Date(sortedDates[i]);
        const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 3600 * 24);
        if (diffDays === 1) {
            currentStreak++;
        } else {
            currentStreak = 1;
        }
        if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
        }
    }
    return maxStreak;
  }

  private static calculateTopVoices(data: any[]): Array<{ voice: string; count: number }> {
    const voiceMap = new Map<string, number>();
    data.forEach(a => {
        const voice = (a.extra_info as any)?.voice_type || 'generated';
        voiceMap.set(voice, (voiceMap.get(voice) || 0) + 1);
    });
    return Array.from(voiceMap.entries())
        .map(([voice, count]) => ({ voice, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
  }

  private static calculateRecentActivity(data: any[]): Array<{ date: string; words: number; projects: number }> {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentData = data.filter(d => new Date(d.created_at) >= thirtyDaysAgo);

      const activityMap = new Map<string, { words: number, projects: number }>();
      recentData.forEach(d => {
          const date = new Date(d.created_at).toISOString().split('T')[0];
          const words = d.words_used || 0;
          const entry = activityMap.get(date) || { words: 0, projects: 0 };
          entry.words += words;
          entry.projects += 1;
          activityMap.set(date, entry);
      });

      return Array.from(activityMap.entries())
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date));
  }

  private static calculateEfficiencyScore(avgWords: number, avgTime: number): number {
    if (!avgWords || !avgTime) return 0;
    const score = (avgWords / 500) * 50 + (1000 / Math.max(avgTime, 1)) * 50;
    return Math.min(100, Math.round(score));
  }
}