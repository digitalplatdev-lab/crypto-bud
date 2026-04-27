import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { ExternalLink, Newspaper, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  body: string;
  published_on: number;
  imageurl: string;
  categories: string;
}

export const NewsFeed: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
        const data = await response.json();
        if (data && data.Data && Array.isArray(data.Data)) {
          setNews(data.Data.slice(0, 15));
        } else {
          console.error('Unexpected news data structure:', data);
          setNews([]);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 300000); // Refresh every 5 mins
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800">
      <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
        <Newspaper className="w-5 h-5 text-orange-500" />
        <h3 className="font-bold text-white">Market News</h3>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-full" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            ))
          ) : (
            news.map((item) => (
              <Card key={item.id} className="bg-zinc-900/30 border-zinc-800 hover:border-zinc-700 transition-colors group">
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    {item.imageurl && (
                      <img 
                        src={item.imageurl} 
                        alt="" 
                        className="w-16 h-16 rounded object-cover flex-shrink-0 border border-zinc-800"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">
                          {item.source}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(item.published_on * 1000)} ago
                        </div>
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-200 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-zinc-500 line-clamp-2 mt-1 leading-relaxed">
                        {item.body}
                      </p>
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Read More <ExternalLink className="w-2 h-2" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
