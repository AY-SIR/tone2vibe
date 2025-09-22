import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap } from "lucide-react";

interface LanguageUsageData {
  id: string;
  project_title: string;
  language: string;
  input_words: number;
  created_at: string;
}

export function LanguageUsageTable() {
  const { user } = useAuth();
  const [data, setData] = useState<LanguageUsageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLanguageUsageData();
    }
  }, [user]);

  const fetchLanguageUsageData = async () => {
    if (!user) return;

    try {
      const { data: analyticsData, error } = await supabase
        .from('history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return;
      }

      const formattedData = (analyticsData || []).map(item => ({
        id: item.id,
        project_title: item.title || 'Voice Project',
        language: item.language,
        input_words: item.words_used || 0,
        created_at: item.created_at
      }));

      setData(formattedData);
    } catch (error) {
      // Silent fail for analytics
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Language Usage Analytics</span>
          </CardTitle>
          <CardDescription>
            Detailed breakdown of language usage per project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>Language Usage Analytics</span>
        </CardTitle>
        <CardDescription>
          Detailed breakdown of language usage per project
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Zap className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p>No language usage data found</p>
            <p className="text-sm">Start creating projects to see detailed analytics</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead className="text-right">Words Used</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => {
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {item.project_title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {item.language}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.input_words.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
