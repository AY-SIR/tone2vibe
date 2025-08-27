
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useRealtimeProcessing, ProcessingJob } from '@/hooks/useRealtime';
import { formatDistanceToNow } from 'date-fns';

export const ProcessingQueue = () => {
  const { jobs, loading } = useRealtimeProcessing();
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  const toggleJobDetails = (jobId: string) => {
    const newExpanded = new Set(expandedJobs);
    if (newExpanded.has(jobId)) {
      newExpanded.delete(jobId);
    } else {
      newExpanded.add(jobId);
    }
    setExpandedJobs(newExpanded);
  };

  const getStatusIcon = (status: string, progress: number) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
      case 'error':
        return 'bg-red-500';
      case 'processing':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatJobType = (jobType: string) => {
    return jobType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Processing Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2" />
            <p>No active processing jobs</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Processing Queue ({jobs.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => toggleJobDetails(job.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(job.status, job.progress)}
                <div>
                  <h4 className="font-medium">{formatJobType(job.job_type)}</h4>
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {job.status === 'processing' && (
                  <div className="flex items-center space-x-2">
                    <Progress value={job.progress} className="w-20" />
                    <span className="text-sm font-medium">{job.progress}%</span>
                  </div>
                )}
                <Badge variant="secondary" className={getStatusColor(job.status)}>
                  {job.status}
                </Badge>
              </div>
            </div>

            {expandedJobs.has(job.id) && (
              <div className="mt-4 pt-4 border-t space-y-2">
                {job.error_message && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    <strong>Error:</strong> {job.error_message}
                  </div>
                )}
                {job.job_data && (
                  <div className="text-sm">
                    <strong>Job Data:</strong>
                    <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-auto">
                      {JSON.stringify(job.job_data, null, 2)}
                    </pre>
                  </div>
                )}
                {job.result_data && (
                  <div className="text-sm">
                    <strong>Result:</strong>
                    <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-auto">
                      {JSON.stringify(job.result_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
