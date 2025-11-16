import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, RotateCw, ZoomIn, ZoomOut, Move, Check, Maximize2 } from 'lucide-react';

interface ImageCropModalProps {
  file: File;
  onCrop: (croppedFile: File) => void;
  onClose: () => void;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({ file, onCrop, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 300, height: 300 });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  const [initialPinchScale, setInitialPinchScale] = useState(1);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleImageLoad = () => {
    if (imageRef.current) {
      const img = imageRef.current;
      const containerWidth = isMobile ? Math.min(window.innerWidth - 40, 350) : 400;
      const containerHeight = isMobile ? Math.min(window.innerHeight - 300, 350) : 400;

      // Calculate initial crop size (80% of smaller dimension)
      const minDimension = Math.min(img.naturalWidth, img.naturalHeight);
      const cropSize = Math.min(minDimension * 0.8, isMobile ? 250 : 300);

      setCrop({
        x: (img.naturalWidth - cropSize) / 2,
        y: (img.naturalHeight - cropSize) / 2,
        width: cropSize,
        height: cropSize
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - crop.x, y: e.clientY - crop.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !imageRef.current) return;
    
    const newX = Math.max(0, Math.min(e.clientX - dragStart.x, imageRef.current.naturalWidth - crop.width));
    const newY = Math.max(0, Math.min(e.clientY - dragStart.y, imageRef.current.naturalHeight - crop.height));
    
    setCrop(prev => ({ ...prev, x: newX, y: newY }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch event handlers for mobile
  const getTouchPosition = (e: TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  };

  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 1) {
      // Single touch - start dragging
      setIsDragging(true);
      const pos = getTouchPosition(e.nativeEvent);
      setDragStart({ x: pos.x - crop.x, y: pos.y - crop.y });
    } else if (e.touches.length === 2) {
      // Two touches - start pinch zoom
      setIsDragging(false);
      setLastTouchDistance(getTouchDistance(e.nativeEvent.touches as any));
      setInitialPinchScale(scale);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();

    if (!imageRef.current) return;

    if (e.touches.length === 1 && isDragging) {
      // Single touch - drag crop area
      const pos = getTouchPosition(e.nativeEvent);
      const newX = Math.max(0, Math.min(pos.x - dragStart.x, imageRef.current.naturalWidth - crop.width));
      const newY = Math.max(0, Math.min(pos.y - dragStart.y, imageRef.current.naturalHeight - crop.height));

      setCrop(prev => ({ ...prev, x: newX, y: newY }));
    } else if (e.touches.length === 2) {
      // Two touches - pinch zoom
      const currentDistance = getTouchDistance(e.nativeEvent.touches as any);
      if (lastTouchDistance > 0) {
        const scaleFactor = currentDistance / lastTouchDistance;
        const newScale = Math.max(0.5, Math.min(3, initialPinchScale * scaleFactor));
        setScale(newScale);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setLastTouchDistance(0);
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const resetCrop = () => {
    if (imageRef.current) {
      const img = imageRef.current;
      const cropSize = Math.min(Math.min(img.naturalWidth, img.naturalHeight) * 0.8, isMobile ? 250 : 300);
      setCrop({
        x: (img.naturalWidth - cropSize) / 2,
        y: (img.naturalHeight - cropSize) / 2,
        width: cropSize,
        height: cropSize
      });
      setScale(1);
      setRotation(0);
    }
  };

  const handleCrop = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    
    // Set canvas size to crop size
    canvas.width = crop.width;
    canvas.height = crop.height;

    // Apply transformations
    ctx.save();
    
    // Translate to center for rotation
    ctx.translate(crop.width / 2, crop.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-crop.width / 2, -crop.height / 2);

    // Draw the cropped portion
    ctx.drawImage(
      img,
      crop.x, crop.y, crop.width, crop.height,
      0, 0, crop.width, crop.height
    );

    ctx.restore();

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], file.name, {
          type: file.type,
          lastModified: Date.now()
        });
        onCrop(croppedFile);
      }
    }, file.type, 0.9);
  }, [crop, scale, rotation, file, onCrop]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Crop Image</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Image Preview */}
            <div className="flex-1">
              <div 
                className="relative bg-gray-100 rounded-lg overflow-hidden"
                style={{ width: '400px', height: '400px' }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Crop preview"
                  onLoad={handleImageLoad}
                  className="w-full h-full object-contain"
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                    transformOrigin: 'center'
                  }}
                />
                
                {/* Crop overlay */}
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 cursor-move"
                  style={{
                    left: `${(crop.x / (imageRef.current?.naturalWidth || 1)) * 100}%`,
                    top: `${(crop.y / (imageRef.current?.naturalHeight || 1)) * 100}%`,
                    width: `${(crop.width / (imageRef.current?.naturalWidth || 1)) * 100}%`,
                    height: `${(crop.height / (imageRef.current?.naturalHeight || 1)) * 100}%`
                  }}
                  onMouseDown={handleMouseDown}
                >
                  <div className="absolute inset-0 border border-white border-dashed"></div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="w-full lg:w-64 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zoom</label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleZoomOut}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <button
                    onClick={handleZoomIn}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-center text-sm text-gray-500 mt-1">{Math.round(scale * 100)}%</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rotation</label>
                <button
                  onClick={handleRotate}
                  className="w-full flex items-center justify-center space-x-2 p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Rotate 90°</span>
                </button>
                <div className="text-center text-sm text-gray-500 mt-1">{rotation}°</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Crop Size</label>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500">Width</label>
                    <input
                      type="range"
                      min="50"
                      max={imageRef.current?.naturalWidth || 500}
                      value={crop.width}
                      onChange={(e) => setCrop(prev => ({ ...prev, width: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 text-center">{crop.width}px</div>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-500">Height</label>
                    <input
                      type="range"
                      min="50"
                      max={imageRef.current?.naturalHeight || 500}
                      value={crop.height}
                      onChange={(e) => setCrop(prev => ({ ...prev, height: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 text-center">{crop.height}px</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-4">
                  <Move className="w-4 h-4 inline mr-1" />
                  Drag the blue area to reposition the crop
                </p>
              </div>
            </div>
          </div>

          {/* Hidden canvas for cropping */}
          <canvas ref={canvasRef} className="hidden" />

          <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleCrop}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Apply Crop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
   );
 };

export default ImageCropModal