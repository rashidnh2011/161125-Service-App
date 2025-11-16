import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Save, X, PenTool } from 'lucide-react';

interface SealProps {
  customerId: number | null;
  onSealCapture?: (sealImage: string) => void;
  onSealSave?: (sealImage: string) => void;
  initialSealImage?: string | null;
  readOnly?: boolean;
  className?: string;
}

const Seal: React.FC<SealProps> = ({
  customerId,
  onSealCapture,
  onSealSave,
  initialSealImage,
  readOnly = false,
  className = ""
}) => {
  const [sealImage, setSealImage] = useState<string | null>(initialSealImage || null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Always update the seal image when initialSealImage changes
    if (initialSealImage !== sealImage) {
      setSealImage(initialSealImage || null);
    }
  }, [initialSealImage]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;

    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#2563eb'; // Blue color for signature
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSealImage(null);
    onSealCapture?.('');
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    setSealImage(dataUrl);
    onSealCapture?.(dataUrl);
    setShowModal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSealImage(result);
      onSealCapture?.(result);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const handleSaveSeal = async () => {
    if (!sealImage || !customerId) return;

    try {
      // Here you would call an API to save the seal
      // For now, just call the onSealSave callback
      onSealSave?.(sealImage);
      alert('Seal saved successfully!');
    } catch (error) {
      alert('Failed to save seal. Please try again.');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Customer Seal
        </label>
        {sealImage && !readOnly && (
          <div className="flex space-x-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              <PenTool className="w-4 h-4 inline mr-1" />
              Edit
            </button>
            <button
              onClick={handleSaveSeal}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              <Save className="w-4 h-4 inline mr-1" />
              Save
            </button>
          </div>
        )}
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        {sealImage ? (
          <div className="text-center">
            <img
              src={sealImage}
              alt="Customer Seal"
              className="max-w-full max-h-32 mx-auto border border-gray-200 rounded"
            />
            <p className="text-sm text-gray-600 mt-2">Customer Seal</p>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Camera className="w-8 h-8 text-gray-400" />
              </div>
              <p>No seal captured</p>
              {!readOnly && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => setShowModal(true)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    <PenTool className="w-4 h-4 inline mr-1" />
                    Draw Seal
                  </button>
                  <button
                    onClick={openFileDialog}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    <Upload className="w-4 h-4 inline mr-1" />
                    Upload
                  </button>
                  <button
                    onClick={openCamera}
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                  >
                    <Camera className="w-4 h-4 inline mr-1" />
                    Camera
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Drawing Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Draw Customer Seal</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="border border-gray-300 rounded w-full cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
            </div>

            <div className="flex justify-between">
              <button
                onClick={clearCanvas}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Clear
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCanvas}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Seal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Seal;
