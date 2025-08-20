'use client';

import { useState, useRef, useCallback } from 'react';
import { MediaItem } from '@/lib/types';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

export default function FileUpload({
  onFilesSelected,
  accept = 'image/*,video/*',
  multiple = true,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 10,
  disabled = false,
  className = ''
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((files: File[]): { valid: File[]; errors: string[] } => {
    const validFiles: File[] = [];
    const newErrors: string[] = [];

    if (files.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`);
      return { valid: [], errors: newErrors };
    }

    files.forEach((file) => {
      // Check file size
      if (file.size > maxSize) {
        newErrors.push(`${file.name} is too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB`);
        return;
      }

      // Check file type
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const isValidType = acceptedTypes.some(type => {
        if (type === 'image/*') return file.type.startsWith('image/');
        if (type === 'video/*') return file.type.startsWith('video/');
        return file.type === type;
      });

      if (!isValidType) {
        newErrors.push(`${file.name} is not a supported file type`);
        return;
      }

      validFiles.push(file);
    });

    return { valid: validFiles, errors: newErrors };
  }, [accept, maxSize, maxFiles]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const { valid, errors } = validateFiles(fileArray);
    
    setErrors(errors);
    
    if (valid.length > 0) {
      onFilesSelected(valid);
    }
  }, [validateFiles, onFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  }, [disabled, handleFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  return (
    <div className={`relative ${className}`}>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled 
            ? 'opacity-50 cursor-not-allowed bg-gray-50' 
            : 'hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-12 h-12 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragOver ? 'Drop files here' : 'Upload files'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Drag and drop files here, or click to select
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {accept.includes('image') && accept.includes('video') 
                ? 'Images and videos up to' 
                : accept.includes('image') 
                ? 'Images up to' 
                : 'Videos up to'
              } {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-red-600">
              {error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}