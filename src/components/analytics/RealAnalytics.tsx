import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BarChart3, TrendingUp, Crown, AlertCircle } from "lucide-react";
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
    queryKey: ['real-analytics', user?.id, profile?.plan],
    queryFn: async () => {
      if (!user || profile?.plan === 'free') return null;
      // Assuming weeklyTrends is part of ProAnalytics as well
      return await AnalyticsService.getUserAnalytics(user.id, profile?.plan) as (ProAnalytics & { weeklyTrends?: any[] });
    },
    enabled: !!user && profile?.plan !== 'free',
    refetchInterval: 30000,
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
    if (!words) return '0';
    if (words >= 1000) return `${(words / 1000).toFixed(1)}K`;
    return words.toString();
  };

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
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <Card className="max-w-md mx-auto">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics Unavailable</h3>
                <p className="text-gray-600 mb-4">Unable to load analytics data</p>
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

            {/* --- Overview Tab with Perfect Responsive Design --- */}
            <TabsContent value="overview" className="space-y-4 sm:space-y-6 animate-scale-in">
              {/* Primary Metrics - 2 cols on mobile, 4 on desktop */}
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
                          (analytics?.wordsRemaining ?? 0) < 100 ? 'text-red-600' : 'text-green-600'
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

              {/* Secondary Metrics - 1 col on mobile, 2 on tablet, 4 on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                  <CardDescription className="text-xs sm:text-sm">Latest usage patterns</CardDescription>
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
                  ) : <p className="text-center text-gray-600 py-12 text-sm sm:text-base">No recent activity</p>}
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
                            outerRadius={80}
                            label={({ language }) => language}
                          >
                            {analytics.languageUsage.map((_, idx) => (
                              <Cell key={idx} fill={`hsl(${idx * 45}, 70%, ${idx % 2 === 0 ? '40%' : '60%'})`} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* === MODIFICATION: Weekly Trends now available for Pro & Premium === */}
              {(isPro || isPremium) && analytics?.weeklyTrends && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Weekly Trends</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Words and projects over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px] sm:h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.weeklyTrends}>
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
              
              {/* === NEW CHART ADDED: Projects per Language (Premium Only) === */}
              {isPremium && analytics?.languageUsage && analytics.languageUsage.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Projects per Language</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Total projects for each language used</CardDescription>
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


              {isPremium && premiumAnalytics.monthlyTrends && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Monthly Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px] sm:h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={premiumAnalytics.monthlyTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="words" fill="#1f2937" />
                          <Bar dataKey="projects" fill="#6b7280" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* --- Insights Tab (Premium) --- */}
            {isPremium && premiumAnalytics.performanceInsights && (
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
                    <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-black text-sm sm:text-base mb-1">Peak Hours</h4>
                      <p className="text-xs sm:text-sm text-gray-700">{premiumAnalytics.performanceInsights.peakUsageHours?.join(', ') || 'No data'}</p>
                    </div>
                    <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-black text-sm sm:text-base mb-1">Efficiency Score</h4>
                      <p className="text-xs sm:text-sm text-gray-700">{premiumAnalytics.performanceInsights.efficiencyScore}%</p>
                    </div>
                    <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-black text-sm sm:text-base mb-1">Processing Times</h4>
                      <p className="text-xs sm:text-sm text-gray-700">
                        Avg: {(premiumAnalytics.performanceInsights.avgProcessingTime / 1000).toFixed(1)}s,
                        Longest: {(premiumAnalytics.performanceInsights.longestResponseTime / 1000).toFixed(1)}s,
                        Shortest: {(premiumAnalytics.performanceInsights.shortestResponseTime / 1000).toFixed(1)}s
                      </p>
                    </div>
                    <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-black text-sm sm:text-base mb-1">Error Rate</h4>
                      <p className="text-xs sm:text-sm text-gray-700">{(premiumAnalytics.performanceInsights.errorRate * 100).toFixed(1)}%</p>
                    </div>
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
