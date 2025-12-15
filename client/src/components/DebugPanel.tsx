import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bug, Trash2, RefreshCw, X, ChevronDown, ChevronUp } from "lucide-react";

interface DebugLogEntry {
  id: string;
  timestamp: Date | string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: 'extraction' | 'generation' | 'api' | 'llm' | 'audio' | 'general';
  message: string;
  data?: Record<string, unknown>;
  duration?: number;
}

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: logs, refetch } = trpc.debug.logs.useQuery(
    selectedCategory === "all" ? { limit: 200 } : { category: selectedCategory as any, limit: 200 },
    { 
      refetchInterval: autoRefresh ? 2000 : false,
      enabled: isOpen 
    }
  );

  const clearMutation = trpc.debug.clear.useMutation({
    onSuccess: () => refetch()
  });

  const testMutation = trpc.debug.test.useMutation({
    onSuccess: () => refetch()
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-500';
      case 'warn': return 'bg-yellow-500';
      case 'debug': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'extraction': return 'bg-purple-500';
      case 'generation': return 'bg-green-500';
      case 'llm': return 'bg-orange-500';
      case 'api': return 'bg-cyan-500';
      case 'audio': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimestamp = (ts: Date | string) => {
    const date = typeof ts === 'string' ? new Date(ts) : ts;
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full w-12 h-12 p-0 bg-amber-600 hover:bg-amber-700 shadow-lg"
        title="Open Debug Panel"
      >
        <Bug className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-4 right-4 z-50 shadow-2xl border-2 border-amber-500 transition-all duration-200 ${isMinimized ? 'w-80 h-14' : 'w-[600px] h-[500px]'}`}>
      <CardHeader className="py-2 px-4 bg-amber-50 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-amber-600" />
          <CardTitle className="text-sm font-semibold">Debug Panel</CardTitle>
          {logs && <Badge variant="outline" className="text-xs">{logs.length} logs</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`h-7 px-2 ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`}
            title={autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          >
            <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-7 px-2"
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearMutation.mutate()}
            className="h-7 px-2 text-red-500 hover:text-red-700"
            title="Clear logs"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-7 px-2"
          >
            {isMinimized ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-7 px-2"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0 h-[calc(100%-56px)]">
          <Tabs defaultValue="all" className="h-full flex flex-col" onValueChange={setSelectedCategory}>
            <TabsList className="w-full justify-start rounded-none border-b px-2 h-9">
              <TabsTrigger value="all" className="text-xs h-7">All</TabsTrigger>
              <TabsTrigger value="extraction" className="text-xs h-7">Extraction</TabsTrigger>
              <TabsTrigger value="generation" className="text-xs h-7">Generation</TabsTrigger>
              <TabsTrigger value="llm" className="text-xs h-7">LLM</TabsTrigger>
              <TabsTrigger value="api" className="text-xs h-7">API</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 p-2">
              {logs && logs.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <Bug className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No logs yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testMutation.mutate()}
                    className="mt-2"
                  >
                    Add test logs
                  </Button>
                </div>
              )}

              <div className="space-y-1">
                {logs?.map((log: DebugLogEntry) => (
                  <div
                    key={log.id}
                    className={`text-xs p-2 rounded border ${
                      log.level === 'error' ? 'bg-red-50 border-red-200' :
                      log.level === 'warn' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-white border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-400 font-mono text-[10px]">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <Badge className={`${getLevelColor(log.level)} text-white text-[10px] px-1 py-0`}>
                        {log.level}
                      </Badge>
                      <Badge className={`${getCategoryColor(log.category)} text-white text-[10px] px-1 py-0`}>
                        {log.category}
                      </Badge>
                    </div>
                    <div className="font-medium text-gray-800">{log.message}</div>
                    {log.data && (
                      <pre className="mt-1 text-[10px] text-gray-500 bg-gray-50 p-1 rounded overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
