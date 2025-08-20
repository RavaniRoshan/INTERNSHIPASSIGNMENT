'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperProps {
  imageUrl: string;
  aspectRatio?: number; // width/height ratio, e.g., 16/9 = 1.78
  onCrop: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
  className?: string;
}

export default function ImageCropper({
  imageUrl,
  aspectRatio = 16 / 9,
  onCrop,
  onCancel,
  className = ''
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Initialize crop area when image loads
  useEffect(() => {
    if (imageLoaded && imageRef.current) {
      const img = imageRef.current;
      const containerWidth = Math.min(img.naturalWidth, 600);
      const containerHeight = Math.min(img.naturalHeight, 400);
      
      setContainerSize({ width: containerWidth, height: containerHeight });

      // Calculate initial crop area (centered, respecting aspect ratio)
      const maxWidth = containerWidth * 0.8;
      const maxHeight = containerHeight * 0.8;
      
      let cropWidth = maxWidth;
      let cropHeight = cropWidth / aspectRatio;
      
      if (cropHeight > maxHeight) {
        cropHeight = maxHeight;
        cropWidth = cropHeight * aspectRatio;
      }

      setCropArea({
        x: (containerWidth - cropWidth) / 2,
        y: (containerHeight - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight
      });
    }
  }, [imageLoaded, aspectRatio]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setCropArea(prev => {
      const newX = Math.max(0, Math.min(containerSize.width - prev.width, prev.x + deltaX));
      const newY = Math.max(0, Math.min(containerSize.height - prev.height, prev.y + deltaY));
      
      return { ...prev, x: newX, y: newY };
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, containerSize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleCrop = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    
    // Calculate scale factors
    const scaleX = img.naturalWidth / containerSize.width;
    const scaleY = img.naturalHeight / containerSize.height;

    // Set canvas size to crop area size
    canvas.width = cropArea.width * scaleX;
    canvas.height = cropArea.height * scaleY;

    // Draw cropped image
    ctx.drawImage(
      img,
      cropArea.x * scaleX,
      cropArea.y * scaleY,
      cropArea.width * scaleX,
      cropArea.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        onCrop(blob);
      }
    }, 'image/jpeg', 0.9);
  }, [cropArea, containerSize, onCrop]);

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Crop Image</h3>
          <p className="text-sm text-gray-600">
            Drag the crop area to select the portion you want to use as cover image
          </p>
        </div>

        <div className="relative inline-block">
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Crop preview"
            onLoad={handleImageLoad}
            className="max-w-full max-h-96 block"
            style={{ 
              width: containerSize.width || 'auto',
              height: containerSize.height || 'auto'
            }}
          />
          
          {imageLoaded && (
            <>
              {/* Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-50" />
              
              {/* Crop area */}
              <div
                className="absolute border-2 border-white cursor-move bg-transparent"
                style={{
                  left: cropArea.x,
                  top: cropArea.y,
                  width: cropArea.width,
                  height: cropArea.height,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Corner handles */}
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border border-gray-300" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border border-gray-300" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border border-gray-300" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border border-gray-300" />
                
                {/* Grid lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="border border-white border-opacity-30" />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            disabled={!imageLoaded}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Crop & Use
          </button>
        </div>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}