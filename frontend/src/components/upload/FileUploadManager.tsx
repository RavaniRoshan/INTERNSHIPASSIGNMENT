'use client';

import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { MediaItem } from '@/lib/types';
import FileUpload from './FileUpload';
import UploadProgress, { UploadProgressItem } from './UploadProgress';
import ImageCropper from './ImageCropper';
import FilePreview from './FilePreview';

interface FileUploadManagerProps {
  mediaItems: MediaItem[];
  coverImageId?: string;
  onMediaItemsChange: (items: MediaItem[]) => void;
  onCoverImageChange: (id: string | undefined) => void;
  maxFiles?: number;
  maxFileSize?: number;
  accept?: string;
  disabled?: boolean;
  className?: string;
}

export default function FileUploadManager({
  mediaItems,
  coverImageId,
  onMediaItemsChange,
  onCoverImageChange,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  accept = 'image/*,video/*',
  disabled = false,
  className = ''
}: FileUploadManagerProps) {
  const [uploads, setUploads] = useState<UploadProgressItem[]>([]);
  const [cropperState, setCropperState] = useState<{
    isOpen: boolean;
    imageUrl: string;
    uploadId: string;
  } | null>(null);

  // Mock upload service - in real app, this would call the actual upload API
  const uploadFile = useCallback(async (file: File, uploadId: string): Promise<{ url: string; thumbnailUrl?: string }> => {
    // Simulate upload progress
    const updateProgress = (progress: number) => {
      setUploads(prev => prev.map(upload => 
        upload.id === uploadId 
          ? { ...upload, progress, status: progress === 100 ? 'processing' : 'uploading' }
          : upload
      ));
    };

    // Simulate upload with progress updates
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      updateProgress(progress);
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    // Create object URL for preview (in real app, this would be the uploaded file URL)
    const url = URL.createObjectURL(file);
    let thumbnailUrl: string | undefined;

    // Generate thumbnail for videos (mock)
    if (file.type.startsWith('video/')) {
      thumbnailUrl = url; // In real app, backend would generate thumbnail
    }

    return { url, thumbnailUrl };
  }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (disabled) return;

    // Check if adding these files would exceed the limit
    const totalFiles = mediaItems.length + uploads.length + files.length;
    if (totalFiles > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Create upload progress items
    const newUploads: UploadProgressItem[] = files.map(file => ({
      id: nanoid(),
      file,
      progress: 0,
      status: 'pending'
    }));

    setUploads(prev => [...prev, ...newUploads]);

    // Start uploads
    for (const upload of newUploads) {
      try {
        // Update status to uploading
        setUploads(prev => prev.map(u => 
          u.id === upload.id ? { ...u, status: 'uploading' } : u
        ));

        // For images, show cropper if it's the first image and no cover is set
        if (upload.file.type.startsWith('image/') && !coverImageId && mediaItems.length === 0) {
          const imageUrl = URL.createObjectURL(upload.file);
          setCropperState({
            isOpen: true,
            imageUrl,
            uploadId: upload.id
          });
          continue; // Skip direct upload, wait for crop
        }

        // Upload file
        const { url, thumbnailUrl } = await uploadFile(upload.file, upload.id);

        // Update upload status
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'completed', progress: 100, url, thumbnailUrl }
            : u
        ));

        // Add to media items
        const newMediaItem: MediaItem = {
          id: upload.id,
          type: upload.file.type.startsWith('image/') ? 'image' : 'video',
          url,
          thumbnailUrl,
          alt: upload.file.name,
          caption: ''
        };

        onMediaItemsChange([...mediaItems, newMediaItem]);

        // Set as cover if it's the first image and no cover is set
        if (newMediaItem.type === 'image' && !coverImageId) {
          onCoverImageChange(newMediaItem.id);
        }

      } catch (error) {
        console.error('Upload failed:', error);
        setUploads(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'error', error: 'Upload failed' }
            : u
        ));
      }
    }
  }, [disabled, maxFiles, mediaItems, uploads, coverImageId, onMediaItemsChange, onCoverImageChange, uploadFile]);

  const handleCropComplete = useCallback(async (croppedBlob: Blob) => {
    if (!cropperState) return;

    const { uploadId } = cropperState;
    setCropperState(null);

    try {
      // Convert blob to file
      const croppedFile = new File([croppedBlob], 'cropped-image.jpg', { type: 'image/jpeg' });
      
      // Update upload status
      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, status: 'uploading', file: croppedFile } : u
      ));

      // Upload cropped file
      const { url } = await uploadFile(croppedFile, uploadId);

      // Update upload status
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, status: 'completed', progress: 100, url }
          : u
      ));

      // Add to media items
      const newMediaItem: MediaItem = {
        id: uploadId,
        type: 'image',
        url,
        alt: 'Cover image',
        caption: ''
      };

      onMediaItemsChange([...mediaItems, newMediaItem]);
      onCoverImageChange(newMediaItem.id);

    } catch (error) {
      console.error('Crop upload failed:', error);
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, status: 'error', error: 'Upload failed' }
          : u
      ));
    }
  }, [cropperState, mediaItems, onMediaItemsChange, onCoverImageChange, uploadFile]);

  const handleCropCancel = useCallback(() => {
    if (!cropperState) return;

    // Remove the upload from progress
    setUploads(prev => prev.filter(u => u.id !== cropperState.uploadId));
    setCropperState(null);
  }, [cropperState]);

  const handleCancelUpload = useCallback((uploadId: string) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  }, []);

  const handleRetryUpload = useCallback(async (uploadId: string) => {
    const upload = uploads.find(u => u.id === uploadId);
    if (!upload) return;

    try {
      setUploads(prev => prev.map(u => 
        u.id === uploadId ? { ...u, status: 'uploading', progress: 0, error: undefined } : u
      ));

      const { url, thumbnailUrl } = await uploadFile(upload.file, uploadId);

      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, status: 'completed', progress: 100, url, thumbnailUrl }
          : u
      ));

      const newMediaItem: MediaItem = {
        id: uploadId,
        type: upload.file.type.startsWith('image/') ? 'image' : 'video',
        url,
        thumbnailUrl,
        alt: upload.file.name,
        caption: ''
      };

      onMediaItemsChange([...mediaItems, newMediaItem]);

    } catch (error) {
      console.error('Retry upload failed:', error);
      setUploads(prev => prev.map(u => 
        u.id === uploadId 
          ? { ...u, status: 'error', error: 'Upload failed' }
          : u
      ));
    }
  }, [uploads, mediaItems, onMediaItemsChange, uploadFile]);

  const handleRemoveUpload = useCallback((uploadId: string) => {
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  }, []);

  const handleRemoveMediaItem = useCallback((itemId: string) => {
    const updatedItems = mediaItems.filter(item => item.id !== itemId);
    onMediaItemsChange(updatedItems);

    // If removed item was cover, clear cover or set new one
    if (itemId === coverImageId) {
      const firstImage = updatedItems.find(item => item.type === 'image');
      onCoverImageChange(firstImage?.id);
    }

    // Clean up object URLs to prevent memory leaks
    const removedItem = mediaItems.find(item => item.id === itemId);
    if (removedItem?.url.startsWith('blob:')) {
      URL.revokeObjectURL(removedItem.url);
    }
  }, [mediaItems, coverImageId, onMediaItemsChange, onCoverImageChange]);

  const handleSetAsCover = useCallback((itemId: string) => {
    onCoverImageChange(itemId);
  }, [onCoverImageChange]);

  const handleUpdateCaption = useCallback((itemId: string, caption: string) => {
    const updatedItems = mediaItems.map(item => 
      item.id === itemId ? { ...item, caption } : item
    );
    onMediaItemsChange(updatedItems);
  }, [mediaItems, onMediaItemsChange]);

  const canUploadMore = mediaItems.length + uploads.length < maxFiles;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* File Upload */}
      {canUploadMore && (
        <FileUpload
          onFilesSelected={handleFilesSelected}
          accept={accept}
          maxSize={maxFileSize}
          maxFiles={maxFiles - mediaItems.length - uploads.length}
          disabled={disabled}
        />
      )}

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <UploadProgress
          uploads={uploads}
          onCancel={handleCancelUpload}
          onRetry={handleRetryUpload}
          onRemove={handleRemoveUpload}
        />
      )}

      {/* File Preview */}
      <FilePreview
        mediaItems={mediaItems}
        coverImageId={coverImageId}
        onRemove={handleRemoveMediaItem}
        onSetAsCover={handleSetAsCover}
        onUpdateCaption={handleUpdateCaption}
      />

      {/* Image Cropper Modal */}
      {cropperState && (
        <ImageCropper
          imageUrl={cropperState.imageUrl}
          aspectRatio={16 / 9}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {/* File count indicator */}
      {(mediaItems.length > 0 || uploads.length > 0) && (
        <div className="text-sm text-gray-500 text-center">
          {mediaItems.length + uploads.length} of {maxFiles} files
          {!canUploadMore && (
            <span className="text-amber-600 ml-2">
              (Maximum reached)
            </span>
          )}
        </div>
      )}
    </div>
  );
}