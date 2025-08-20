'use client';

import { useState } from 'react';
import { MediaItem } from '@/lib/types';

interface FilePreviewProps {
  mediaItems: MediaItem[];
  onRemove: (id: string) => void;
  onSetAsCover: (id: string) => void;
  onUpdateCaption: (id: string, caption: string) => void;
  coverImageId?: string;
  className?: string;
}

export default function FilePreview({
  mediaItems,
  onRemove,
  onSetAsCover,
  onUpdateCaption,
  coverImageId,
  className = ''
}: FilePreviewProps) {
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionValue, setCaptionValue] = useState('');

  const handleEditCaption = (item: MediaItem) => {
    setEditingCaption(item.id);
    setCaptionValue(item.caption || '');
  };

  const handleSaveCaption = (id: string) => {
    onUpdateCaption(id, captionValue);
    setEditingCaption(null);
    setCaptionValue('');
  };

  const handleCancelCaption = () => {
    setEditingCaption(null);
    setCaptionValue('');
  };

  const formatFileSize = (url: string): string => {
    // In a real app, you'd store file size with the media item
    return 'Unknown size';
  };

  if (mediaItems.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <svg className="mx-auto w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p>No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">
          Uploaded Files ({mediaItems.length})
        </h3>
        {coverImageId && (
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            Cover image selected
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mediaItems.map((item) => (
          <div
            key={item.id}
            className={`relative bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
              item.id === coverImageId ? 'ring-2 ring-blue-500' : 'border-gray-200'
            }`}
          >
            {/* Media preview */}
            <div className="aspect-video bg-gray-100 relative">
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={item.alt || 'Uploaded image'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <svg className="mx-auto w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs text-gray-500">Video</p>
                    </div>
                  )}
                </div>
              )}

              {/* Cover badge */}
              {item.id === coverImageId && (
                <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                  Cover
                </div>
              )}

              {/* Action buttons */}
              <div className="absolute top-2 right-2 flex space-x-1">
                {item.type === 'image' && item.id !== coverImageId && (
                  <button
                    onClick={() => onSetAsCover(item.id)}
                    className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 p-1.5 rounded-full shadow-sm transition-all"
                    title="Set as cover image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => onRemove(item.id)}
                  className="bg-red-500 bg-opacity-90 hover:bg-opacity-100 text-white p-1.5 rounded-full shadow-sm transition-all"
                  title="Remove file"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* File info and caption */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 capitalize">
                  {item.type}
                </span>
                <span className="text-xs text-gray-400">
                  {formatFileSize(item.url)}
                </span>
              </div>

              {/* Caption */}
              {editingCaption === item.id ? (
                <div className="space-y-2">
                  <textarea
                    value={captionValue}
                    onChange={(e) => setCaptionValue(e.target.value)}
                    placeholder="Add a caption..."
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    rows={2}
                  />
                  <div className="flex justify-end space-x-1">
                    <button
                      onClick={handleCancelCaption}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveCaption(item.id)}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => handleEditCaption(item)}
                  className="cursor-pointer"
                >
                  {item.caption ? (
                    <p className="text-xs text-gray-700 line-clamp-2">
                      {item.caption}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      Click to add caption
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}