import React, { useState, useEffect } from 'react';
import { Play, ExternalLink, Globe } from 'lucide-react';

interface LinkPreviewProps {
  url: string;
  className?: string;
}

interface PreviewData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  type?: 'website' | 'youtube' | 'video' | 'image';
  youtubeId?: string;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ url, className = '' }) => {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    fetchPreviewData(url);
  }, [url]);

  const fetchPreviewData = async (url: string) => {
    try {
      setLoading(true);
      setError(false);

      // Check if it's a YouTube URL
      const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (youtubeMatch) {
        const videoId = youtubeMatch[1];
        setPreviewData({
          type: 'youtube',
          youtubeId: videoId,
          title: 'YouTube Video',
          siteName: 'YouTube',
          image: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        });
        setLoading(false);
        return;
      }

      // For other URLs, fetch metadata from backend
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const data = await response.json();
        setPreviewData(data);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleYouTubePlay = () => {
    setIsPlaying(true);
  };

  if (loading) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-3 animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  if (error || !previewData) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border-l-4 border-blue-500 ${className}`}>
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-blue-500" />
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline text-sm truncate"
          >
            {url}
          </a>
        </div>
      </div>
    );
  }

  if (previewData.type === 'youtube' && previewData.youtubeId) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden ${className}`}>
        {!isPlaying ? (
          <div className="relative">
            <img 
              src={previewData.image} 
              alt={previewData.title}
              className="w-full h-32 object-cover"
              onError={(e) => {
                e.currentTarget.src = `https://img.youtube.com/vi/${previewData.youtubeId}/hqdefault.jpg`;
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
              <button
                onClick={handleYouTubePlay}
                className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2 transition-all duration-200 transform hover:scale-110"
              >
                <Play className="h-4 w-4 ml-0.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="relative pb-[56.25%] h-0">
            <iframe
              src={`https://www.youtube.com/embed/${previewData.youtubeId}?autoplay=1&mute=1`}
              className="absolute top-0 left-0 w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        <div className="p-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
            {previewData.title}
          </h4>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Globe className="h-4 w-4" />
            <span>{previewData.siteName}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden ${className}`}>
      {previewData.image && (
        <img 
          src={previewData.image} 
          alt={previewData.title}
          className="w-full h-32 object-cover"
        />
      )}
      <div className="p-3">
        {previewData.title && (
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
            {previewData.title}
          </h4>
        )}
        {previewData.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
            {previewData.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Globe className="h-4 w-4" />
            <span>{previewData.siteName || new URL(url).hostname}</span>
          </div>
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default LinkPreview;