import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { AnalyticsService, type ProAnalytics, type PremiumAnalytics } from "@/services/analyticsService";
import { useToast } from "@/hooks/use-toast";

const RealAnalytics = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    if (profile?.plan === 'free') {
      navigate('/payment');
      return;
    }
  }, [user, profile, navigate]);

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['real-analytics', user?.id, profile?.plan, profile?.plan_start_date, profile?.plan_expires_at],
    queryFn: async () => {
      if (!user || profile?.plan === 'free') return null;
      return await AnalyticsService.getUserAnalytics(user.id, profile?.plan);
    },
    enabled: !!user && profile?.plan !== 'free',
    refetchInterval: 5000,
    retry: 3
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading data",
        description: "Unable to load analytics",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  if (!user || profile?.plan === 'free') return null;

  const isPro = profile?.plan === 'pro';
  const isPremium = profile?.plan === 'premium';
  const premiumAnalytics = analytics as PremiumAnalytics;

  const formatWords = (words?: number) => {
    if (words === null || typeof words === 'undefined') return '0';
    if (words >= 1000) return `${(words / 1000).toFixed(1)}K`;
    return words.toString();
  };

  // --- FIX: Properly extract performance insights ---
  const performanceInsights = premiumAnalytics?.performanceInsights;
  const insightsData = useMemo(() => [
    {
      label: "Peak Hours",
      value: performanceInsights?.peakUsageHours?.length
        ? performanceInsights.peakUsageHours.join(', ')
        : 'N/A',
    },
    {
      label: "Efficiency Score",
      value: `${performanceInsights?.efficiencyScore ?? 0}%`,
    },
    {
      label: "Processing Times",
      value: `Avg: ${((performanceInsights?.avgProcessingTime ?? 0) / 1000).toFixed(1)}s, Max: ${((performanceInsights?.longestResponseTime ?? 0) / 1000).toFixed(1)}s`,
    },
    {
      label: "Error Rate",
      value: `${((performanceInsights?.errorRate ?? 0) * 100).toFixed(1)}%`,
    },
  ], [performanceInsights]);

// Create hourly usage data for the last 24 hours (starting from current hour)
const now = new Date();
const currentHour = now.getHours();

const hourlyUsageIST = Array.from({ length: 24 }, (_, i) => {
  const hourIndex = (currentHour - 23 + i + 24) % 24;
  const hour = hourIndex.toString().padStart(2, '0');
  return { hour: `${hour}:00`, words: 0, hourIndex };
});

// Map the analytics data to the hourly array
premiumAnalytics?.hourlyUsage?.forEach(item => {
  const itemHour = parseInt(item.hour.split(':')[0], 10);
  const found = hourlyUsageIST.find(h => h.hourIndex === itemHour);
  if (found) {
    found.words += item.words || 0;
  }
});




  // --- FIX: Convert weekly trends to IST with proper date formatting ---
  const weeklyTrendsIST = analytics?.weeklyTrends?.map(item => {
    const dayDate = new Date(item.week + 'T00:00:00Z');
    dayDate.setHours(dayDate.getHours() + 5);
    dayDate.setMinutes(dayDate.getMinutes() + 30);
    const dayLabel = dayDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return { ...item, week: dayLabel };
  }) || [];

  // --- FIX: Convert monthly trends to IST with proper date formatting ---
  const monthlyTrendsIST = premiumAnalytics?.monthlyTrends?.map(item => {
    const dayDate = new Date(item.month + 'T00:00:00Z');
    dayDate.setHours(dayDate.getHours() + 5);
    dayDate.setMinutes(dayDate.getMinutes() + 30);
    const dayLabel = dayDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return { ...item, month: dayLabel };
  }) || [];

  return (
    <div className="min-h-screen bg-white animate-fade-in">
      <div className="flex justify-end w-full mb-4 px-4">
        <Badge className={`${isPremium ? "bg-black" : "bg-gray-600"} text-white`}>
          {isPremium ? "Premium" : "Pro"} Analytics
        </Badge>
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-6xl">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <Card className="max-w-md mx-auto">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics Unavailable</h3>
                <p className="text-gray-600 mb-4">Unable to load analytics data at this time.</p>
                <Button onClick={() => window.location.reload()}>Try Again</Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className={`grid w-full ${isPremium ? 'grid-cols-4' : 'grid-cols-3'} max-w-full sm:max-w-md mx-auto`}>
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="usage" className="text-xs sm:text-sm">Usage</TabsTrigger>
              <TabsTrigger value="charts" className="text-xs sm:text-sm">Charts</TabsTrigger>
              {isPremium && <TabsTrigger value="insights" className="text-xs sm:text-sm">Insights</TabsTrigger>}
            </TabsList>

            {/* --- Overview Tab --- */}
            <TabsContent value="overview" className="space-y-4 sm:space-y-6 animate-scale-in">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="border-2 hover:shadow-md transition-shadow">
                  <CardContent className="pt-5 pb-5 px-3 sm:px-4">
                    <div className="flex flex-col items-center justify-center space-y-1 sm:space-y-2">
                      <div className="text-2xl sm:text-3xl font-bold text-black">
                        {analytics?.totalProjects || 0}
                      </div>
                      <div className="text-gray-600 text-xs sm:text-sm font-medium text-center">
                        Projects
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 hover:shadow-md transition-shadow">
                  <CardContent className="pt-5 pb-5 px-3 sm:px-4">
                    <div className="flex flex-col items-center justify-center space-y-1 sm:space-y-2">
                      <div className="text-2xl sm:text-3xl font-bold text-black">
                        {formatWords(analytics?.totalWordsProcessed)}
                      </div>
                      <div className="text-gray-600 text-xs sm:text-sm font-medium text-center">
                        Words Used
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 hover:shadow-md transition-shadow">
                  <CardContent className="pt-5 pb-5 px-3 sm:px-4">
                    <div className="flex flex-col items-center justify-center space-y-1 sm:space-y-2">
                      <div
                        className={`text-2xl sm:text-3xl font-bold ${
                          (analytics?.wordsRemaining ?? 0) < 1000 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {formatWords(analytics?.wordsRemaining)}
                      </div>
                      <div className="text-gray-600 text-xs sm:text-sm font-medium text-center">
                        Remaining
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 hover:shadow-md transition-shadow">
                  <CardContent className="pt-5 pb-5 px-3 sm:px-4">
                    <div className="flex flex-col items-center justify-center space-y-1 sm:space-y-2">
                      <div className="text-2xl sm:text-3xl font-bold text-black">
                        {analytics?.languageUsage?.length || 0}
                      </div>
                      <div className="text-gray-600 text-xs sm:text-sm font-medium text-center">
                        Languages
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <Card className="border hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4 px-3 sm:px-4">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <div className="text-xl sm:text-xl font-bold text-black">
                        {analytics?.avgWordsPerProject?.toFixed(1) || '0.0'}
                      </div>
                      <div className="text-gray-600 text-xs sm:text-sm text-center">
                        Avg Words/Project
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4 px-3 sm:px-4">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <div className="text-xl sm:text-xl font-bold text-black">
                        {analytics?.peakDayOfWeek || 'N/A'}
                      </div>
                      <div className="text-gray-600 text-xs sm:text-sm text-center">
                        Peak Day
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4 px-3 sm:px-4">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <div className="text-xl sm:text-xl font-bold text-black">
                        {analytics?.usageStreakDays || 0}
                      </div>
                      <div className="text-gray-600 text-xs sm:text-sm text-center">
                        Usage Streak (Days)
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* --- Usage Tab --- */}
            <TabsContent value="usage" className="space-y-4 sm:space-y-6 animate-scale-in">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Recent Activity</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Your last 10 days of activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics?.recentActivity?.length > 0 ? (
                    <div className="space-y-3 sm:space-y-4">
                      {analytics.recentActivity.slice(0, 10).map((activity, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 sm:p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex-1">
                            <div className="font-medium text-sm sm:text-base">{activity.date}</div>
                            <div className="text-xs sm:text-sm text-gray-600">{activity.projects} project(s)</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-sm sm:text-base">{activity.words.toLocaleString()}</div>
                            <div className="text-xs sm:text-sm text-gray-600">words</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-center text-gray-600 py-12 text-sm sm:text-base">No recent activity to display</p>}
                </CardContent>
              </Card>
            </TabsContent>

            {/* --- Charts Tab --- */}
            <TabsContent value="charts" className="space-y-4 sm:space-y-6 animate-scale-in">
              {analytics?.languageUsage?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Language Distribution</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Usage breakdown by language</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px] sm:h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.languageUsage}
                            dataKey="count"
                            nameKey="language"
                            cx="50%"
                            cy="50%"
                            outerRadius="80%"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {analytics.languageUsage.map((_, idx) => (
                              <Cell key={`cell-${idx}`} fill={`hsl(${idx * 60}, 70%, ${50 + (idx % 2 * 10)}%)`} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [value, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Hourly Activity Breakdown - Premium Only */}
              {isPremium && hourlyUsageIST && hourlyUsageIST.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Hourly Activity Breakdown</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Word usage by hour of the day (IST)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px] sm:h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={hourlyUsageIST}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
  <YAxis tick={{ fontSize: 12 }} />
  <Tooltip cursor={{ fill: 'rgba(200, 200, 200, 0.2)' }} />
  <Bar dataKey="words" name="Words Processed" fill="#FFA500" />
</BarChart>


                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Weekly Trends - Pro & Premium */}
                {(isPro || isPremium) && weeklyTrendsIST && weeklyTrendsIST.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl">Weekly Trends</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Last 7 days activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px] sm:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={weeklyTrendsIST}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="words" fill="#000000" name="Words" />
                            <Bar dataKey="projects" fill="#666666" name="Projects" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Monthly Trends - Premium Only */}
                {isPremium && monthlyTrendsIST && monthlyTrendsIST.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl">Monthly Trends</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Last 30 days activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px] sm:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyTrendsIST}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="words" fill="#1f2937" name="Words" />
                            <Bar dataKey="projects" fill="#6b7280" name="Projects" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Projects per Language - Premium Only */}
                {isPremium && analytics?.languageUsage && analytics.languageUsage.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg sm:text-xl">Projects per Language</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Total projects for each language</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px] sm:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.languageUsage}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="language" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="count" name="Projects" fill="#4a5568" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* --- Insights Tab (Premium Only) --- */}
            {isPremium && (
              <TabsContent value="insights" className="space-y-4 sm:space-y-6 animate-scale-in">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                      <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-black" />
                      <span>Premium Insights</span>
                      <Badge className="bg-black text-white text-xs">Premium</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    {insightsData.map((insight, index) => (
                      <div key={index} className="p-3 sm:p-4 bg-gray-50 rounded-lg flex justify-between items-center text-sm sm:text-base">
                        <h4 className="font-medium text-gray-800">{insight.label}</h4>
                        <p className="font-semibold text-black">{insight.value}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default RealAnalytics;