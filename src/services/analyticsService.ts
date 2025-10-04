import { supabase } from '@/integrations/supabase/client';

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
  planInfo: { plan: string; wordsUsed: number; wordsLimit: number; planExpiry: string | null };
}

export interface PremiumAnalytics extends ProAnalytics {
  weeklyTrends: Array<{ week: string; words: number; projects: number; growth: number }>;
  monthlyTrends: Array<{ month: string; words: number; projects: number }>;
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

export class AnalyticsService {

  /** ------------------------------
   * Fetch Pro/Premium analytics
   * ------------------------------- */
  static async getUserAnalytics(userId: string, plan?: string): Promise<ProAnalytics | PremiumAnalytics | null> {
    if (!plan || (plan !== 'pro' && plan !== 'premium')) return null;

    try {
      // --- Fetch user profile ---
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (profileError) throw profileError;
      if (!profile) return null;

      const totalWordsUsed = profile.plan_words_used || 0;
      const planLimit = profile.words_limit || 0;
      const purchasedWords = profile.word_balance || 0;
      const totalLimit = planLimit + purchasedWords;
      const wordsRemaining = Math.max(0, totalLimit - totalWordsUsed);

      // --- Fetch analytics ---
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('analytics')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (analyticsError) throw analyticsError;
      const filteredData = analyticsData || [];

      // --- Basic calculations ---
      const totalProjects = filteredData.length;
      const totalAudioGenerated = filteredData.length;
      const avgWordsPerProject = totalProjects > 0
        ? filteredData.reduce((sum, a) => sum + (a.words_used || 0), 0) / totalProjects
        : 0;

      const avgProjectTimeMs = filteredData.length > 0
        ? Math.round(filteredData.filter(a => a.response_time_ms && a.response_time_ms > 0).reduce((sum, a) => sum + (a.response_time_ms || 0), 0) / filteredData.filter(a => a.response_time_ms && a.response_time_ms > 0).length || 1)
        : 0;

      // --- Recent activity (last 30 days) ---
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentData = filteredData.filter(a => new Date(a.created_at) >= thirtyDaysAgo);

      const activityMap = new Map<string, { words: number; projects: number }>();
      recentData.forEach(a => {
        const date = new Date(a.created_at).toISOString().split('T')[0];
        const existing = activityMap.get(date) || { words: 0, projects: 0 };
        activityMap.set(date, { words: existing.words + (a.words_used || 0), projects: existing.projects + 1 });
      });
      const recentActivity = Array.from(activityMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // --- Language usage ---
      const languageMap = new Map<string, number>();
      filteredData.forEach(a => {
        const lang = a.language || 'en-US';
        languageMap.set(lang, (languageMap.get(lang) || 0) + 1);
      });
      const totalLanguageUsage = Array.from(languageMap.values()).reduce((sum, count) => sum + count, 0);
      const languageUsage = Array.from(languageMap.entries()).map(([language, count]) => ({
        language,
        count,
        percentage: totalLanguageUsage > 0 ? Math.round((count / totalLanguageUsage) * 100) : 0
      })).sort((a, b) => b.count - a.count);

      // --- Voice usage ---
      const voiceMap = new Map<string, number>();
      filteredData.forEach(a => {
        const voice = a.voice_type || 'generated';
        voiceMap.set(voice, (voiceMap.get(voice) || 0) + 1);
      });
      const topVoices = Array.from(voiceMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([voice, count]) => ({ voice, count }))
        .slice(0, 3); // Top 3 voices

      // --- Peak day of week ---
      const dayMap = new Map<number, number>();
      filteredData.forEach(a => {
        const day = new Date(a.created_at).getDay();
        dayMap.set(day, (dayMap.get(day) || 0) + 1);
      });
      const peakDayOfWeek = dayMap.size > 0
        ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          [Array.from(dayMap.entries()).sort((a, b) => b[1] - a[1])[0][0]]
        : 'Unknown';

      // --- Usage streak (consecutive days) ---
      const sortedDates = Array.from(new Set(filteredData.map(a => new Date(a.created_at).toISOString().split('T')[0]))).sort();
      let streak = 0, maxStreak = 0;
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        if (diff === 1) streak++; else streak = 1;
        if (streak > maxStreak) maxStreak = streak;
      }

      const baseAnalytics: ProAnalytics = {
        totalProjects,
        totalWordsProcessed: totalWordsUsed,
        wordsRemaining,
        totalAudioGenerated,
        recentActivity,
        languageUsage,
        topVoices,
        avgWordsPerProject,
        peakDayOfWeek,
        avgProjectTimeMs,
        usageStreakDays: maxStreak,
        planInfo: {
          plan: profile.plan || 'free',
          wordsUsed: totalWordsUsed,
          wordsLimit: totalLimit,
          planExpiry: profile.plan_expires_at || null
        }
      };

      // --- Premium-specific metrics ---
      if (plan === 'premium') {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const last90Data = filteredData.filter(a => new Date(a.created_at) >= ninetyDaysAgo);
        const last90Map = new Map<string, { words: number; projects: number }>();
        last90Data.forEach(a => {
          const date = new Date(a.created_at).toISOString().split('T')[0];
          const existing = last90Map.get(date) || { words: 0, projects: 0 };
          last90Map.set(date, { words: existing.words + (a.words_used || 0), projects: existing.projects + 1 });
        });
        const last90DaysActivity = Array.from(last90Map.entries())
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date));

        const premiumAnalytics: PremiumAnalytics = {
          ...baseAnalytics,
          weeklyTrends: this.generateWeeklyTrends(filteredData),
          monthlyTrends: this.generateMonthlyTrends(filteredData),
          performanceInsights: {
            efficiencyScore: this.calculateEfficiencyScore(filteredData),
            avgProcessingTime: avgProjectTimeMs,
            peakUsageHours: this.calculatePeakUsageHours(filteredData),
            longestResponseTime: filteredData.length > 0 ? Math.max(...filteredData.map(a => a.response_time_ms || 0), 0) : 0,
            shortestResponseTime: filteredData.length > 0 ? Math.min(...filteredData.filter(a => a.response_time_ms && a.response_time_ms > 0).map(a => a.response_time_ms || 0), Infinity) : 0,
            errorRate: filteredData.length > 0
              ? (filteredData.filter(a => a.error || a.status === 'failed').length / filteredData.length) * 100
              : 0
          },
          last90DaysActivity
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
   * Detailed analytics per project
   * ------------------------------- */
  static async getDetailedAnalytics(userId: string, plan?: string): Promise<DetailedAnalytics[] | null> {
    if (!plan || (plan !== 'pro' && plan !== 'premium')) return null;

    try {
      const { data, error } = await supabase
        .from('analytics')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return [];

      return (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        project_id: item.history_id,
        language: item.language || 'en-US',
        input_words: item.words_used || 0,
        output_words: item.words_used || 0,
        voice_type: item.voice_type || 'generated',
        voice_id: item.voice_id,
        response_time_ms: item.response_time_ms || 0,
        created_at: item.created_at
      }));

    } catch (error) {
      console.error('Error fetching detailed analytics:', error);
      return [];
    }
  }

  /** ------------------------------
   * Weekly trends
   * ------------------------------- */
  private static generateWeeklyTrends(data: any[]): Array<{ week: string; words: number; projects: number; growth: number }> {
    const weeklyMap = new Map<string, { words: number; projects: number }>();
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    data.filter(a => new Date(a.created_at) >= twelveWeeksAgo).forEach(a => {
      const date = new Date(a.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      const existing = weeklyMap.get(weekKey) || { words: 0, projects: 0 };
      weeklyMap.set(weekKey, { words: existing.words + (a.words_used || 0), projects: existing.projects + 1 });
    });

    const trends = Array.from(weeklyMap.entries()).map(([week, data]) => ({ week, ...data, growth: 0 }))
      .sort((a, b) => a.week.localeCompare(b.week));

    for (let i = 1; i < trends.length; i++) {
      const prev = trends[i - 1];
      const curr = trends[i];
      curr.growth = prev.words > 0 ? Math.round(((curr.words - prev.words) / prev.words) * 100) : 0;
    }
    return trends;
  }

  /** ------------------------------
   * Monthly trends
   * ------------------------------- */
  private static generateMonthlyTrends(data: any[]): Array<{ month: string; words: number; projects: number }> {
    const monthMap = new Map<string, { words: number; projects: number }>();
    data.forEach(a => {
      const date = new Date(a.created_at);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      const existing = monthMap.get(monthKey) || { words: 0, projects: 0 };
      monthMap.set(monthKey, { words: existing.words + (a.words_used || 0), projects: existing.projects + 1 });
    });
    return Array.from(monthMap.entries()).map(([month, data]) => ({ month, ...data })).sort((a, b) => a.month.localeCompare(b.month));
  }

  /** ------------------------------
   * Peak usage hours
   * ------------------------------- */
  private static calculatePeakUsageHours(data: any[]): string[] {
    const hourMap = new Map<number, number>();
    data.forEach(a => {
      const hour = new Date(a.created_at).getHours();
      hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
    });
    const sortedHours = Array.from(hourMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => `${hour.toString().padStart(2, '0')}:00`);
    return sortedHours;
  }

  /** ------------------------------
   * Efficiency score
   * ------------------------------- */
  private static calculateEfficiencyScore(data: any[]): number {
    if (!data.length) return 0;
    const avgWords = data.reduce((sum, a) => sum + (a.words_used || 0), 0) / data.length;
    const avgTime = data.reduce((sum, a) => sum + (a.response_time_ms || 0), 0) / data.length;
    return Math.min(100, Math.round((avgWords / 500) * 50 + (1000 / Math.max(avgTime, 1)) * 50));
  }

}
