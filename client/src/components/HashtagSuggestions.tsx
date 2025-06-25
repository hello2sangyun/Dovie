import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Hash, File, MessageSquare } from 'lucide-react';

interface HashtagSuggestionsProps {
  query: string;
  onSelect: (hashtag: string) => void;
  isVisible: boolean;
  position?: { x: number; y: number };
}

interface HashtagResult {
  hashtag: string;
  count: number;
  type: 'command' | 'file';
  recentFiles?: string[];
}

export function HashtagSuggestions({ query, onSelect, isVisible, position }: HashtagSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<HashtagResult[]>([]);

  // Search hashtags from commands/files
  const { data: searchResults } = useQuery({
    queryKey: ['/api/commands/search', query],
    enabled: isVisible && query.startsWith('#') && query.length > 1,
    staleTime: 5000,
  });

  // Get popular hashtags when just typing "#"
  const { data: popularHashtags } = useQuery({
    queryKey: ['/api/commands/hashtags'],
    enabled: isVisible && query === '#',
    staleTime: 30000,
  });

  useEffect(() => {
    if (query === '#' && popularHashtags) {
      // Show popular hashtags
      const popular = (popularHashtags as any)?.hashtags || [];
      setSuggestions(popular.slice(0, 8).map((tag: any) => ({
        hashtag: tag.hashtag,
        count: tag.count,
        type: 'command' as const,
        recentFiles: tag.recentFiles
      })));
    } else if (query.length > 1 && searchResults) {
      // Show search results
      const results = (searchResults as any)?.results || [];
      setSuggestions(results.slice(0, 8));
    } else {
      setSuggestions([]);
    }
  }, [query, searchResults, popularHashtags]);

  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  return (
    <div 
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-w-sm w-full"
      style={{
        bottom: position ? undefined : '100%',
        left: position?.x || 0,
        top: position?.y,
        marginBottom: position ? undefined : '8px'
      }}
    >
      <div className="p-2">
        <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <Hash className="h-3 w-3" />
          {query === '#' ? 'Popular Hashtags' : 'Search Results'}
        </div>
        
        <div className="space-y-1">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSelect(suggestion.hashtag)}
              className="w-full text-left p-2 hover:bg-purple-50 rounded-md transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {suggestion.type === 'file' ? (
                    <File className="h-4 w-4 text-blue-500" />
                  ) : (
                    <MessageSquare className="h-4 w-4 text-green-500" />
                  )}
                  <span className="font-medium text-purple-600">
                    #{suggestion.hashtag}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {suggestion.count} items
                </span>
              </div>
              
              {suggestion.recentFiles && suggestion.recentFiles.length > 0 && (
                <div className="text-xs text-gray-500 mt-1 ml-6">
                  Recent: {suggestion.recentFiles.slice(0, 2).join(', ')}
                  {suggestion.recentFiles.length > 2 && '...'}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}