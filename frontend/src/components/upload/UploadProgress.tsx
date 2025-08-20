'use client';

import { useState, useEffect } from 'react';

export interface UploadProgressItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  url?: string;
  thumbnailUrl?: string;
}

interface UploadProgressProps {
  uploads: UploadProgressItem[];
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export default function UploadProgress({ uploads, onCancel, onRetry, onRemove }: UploadProgressProps) {
  if (uploads.length === 0) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: UploadProgressItem['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-500';
      case 'uploading':
        return 'text-blue-600';
      case 'processing':
        return 'text-yellow-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusText = (status: UploadProgressItem['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'uploading':
        return 'Uploading';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900">Upload Progress</h3>
      
      <div className="space-y-2">
        {uploads.map((upload) => (
          <div key={upload.id} className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {/* File preview */}
                <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  {upload.file.type.startsWith('image/') ? (
                    upload.url ? (
                      <img
                        src={upload.url}
                        alt={upload.file.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {upload.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(upload.file.size)}
                  </p>
                </div>

                {/* Status */}
                <div className="flex-shrink-0">
                  <span className={`text-xs font-medium ${getStatusColor(upload.status)}`}>
                    {getStatusText(upload.status)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 ml-3">
                {upload.status === 'uploading' && onCancel && (
                  <button
                    onClick={() => onCancel(upload.id)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="Cancel upload"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                {upload.status === 'error' && onRetry && (
                  <button
                    onClick={() => onRetry(upload.id)}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Retry upload"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}

                {(upload.status === 'completed' || upload.status === 'error') && onRemove && (
                  <button
                    onClick={() => onRemove(upload.id)}
                    className="text-gray-400 hover:text-red-600 p-1"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {(upload.status === 'uploading' || upload.status === 'processing') && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    upload.status === 'uploading' ? 'bg-blue-600' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
            )}

            {/* Error message */}
            {upload.status === 'error' && upload.error && (
              <p className="text-xs text-red-600 mt-1">{upload.error}</p>
            )}

            {/* Progress percentage */}
            {(upload.status === 'uploading' || upload.status === 'processing') && (
              <p className="text-xs text-gray-500 mt-1">
                {upload.progress}% {upload.status === 'processing' ? 'processed' : 'uploaded'}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}