
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Clock, Globe, Zap, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AnalyticsService } from "@/services/analyticsService";

interface AnalyticsData {
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

export function AnalyticsPage() {
  const { user, profile } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('Loading analytics for user:', user.id, 'plan:', profile?.plan);
      const data = await AnalyticsService.getUserAnalytics(user.id, profile?.plan || 'free');
      console.log('Analytics data loaded:', data);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      // Set fallback data to prevent blank screen
      setAnalytics({
        totalProjects: 0,
        totalWordsProcessed: 0,
        wordsRemaining: profile?.words_limit || 1000,
        totalAudioGenerated: 0,
        recentActivity: [],
        languageUsage: [],
        planInfo: {
          plan: profile?.plan || 'free',
          wordsUsed: profile?.plan_words_used || 0, // Use plan_words_used in fallback too
          wordsLimit: profile?.words_limit || 1000,
          planExpiry: profile?.plan_expires_at || null
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile || (profile.plan === 'free')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-semibold mb-2">Analytics Available for Pro & Premium</h2>
          <p className="text-muted-foreground mb-6">
            Upgrade your plan to access detailed usage analytics and insights
          </p>
          <a 
            href="/payment" 
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Upgrade Plan
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const wordUsagePercentage = profile.words_limit 
    ? ((profile.plan_words_used || 0) / profile.words_limit) * 100  // Use plan_words_used
    : 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track your usage and performance metrics</p>
        </div>
        <Badge variant="secondary" className="capitalize">
          {profile.plan} Plan
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              Audio files created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Words Processed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalWordsProcessed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total words converted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2s</div>
            <p className="text-xs text-muted-foreground">
              Generation speed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Languages Used</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.languageUsage.length}</div>
            <p className="text-xs text-muted-foreground">
              Different languages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Word Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Word Usage</CardTitle>
          <CardDescription>Your current word consumption and limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Used: {(profile.plan_words_used || 0).toLocaleString()}</span>
            <span>Limit: {(profile.words_limit || 0).toLocaleString()}</span>
          </div>
          <Progress value={wordUsagePercentage} className="w-full" />
          <p className="text-xs text-muted-foreground">
            {(profile.words_limit || 0) - (profile.plan_words_used || 0)} plan words remaining • {(profile.word_balance || 0).toLocaleString()} purchased words (never expire)
          </p>
        </CardContent>
      </Card>

      {/* Language Statistics */}
      {analytics.languageUsage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Language Distribution</CardTitle>
            <CardDescription>Most used languages in your generations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.languageUsage.slice(0, 5).map((lang, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-primary" style={{ 
                      backgroundColor: `hsl(${index * 60}, 70%, 50%)` 
                    }} />
                    <span className="text-sm font-medium">{lang.language}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">{lang.count} uses</span>
                    <Badge variant="outline">{lang.percentage.toFixed(1)}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {analytics.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest voice generations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Daily Activity</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.words} words • {activity.projects} projects
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(activity.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
