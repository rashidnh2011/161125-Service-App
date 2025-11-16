import React, { useState, useRef } from 'react';
import { Upload, Camera, Save, X } from 'lucide-react';
import ImageUpload from './ImageUpload';

interface CustomerSealUploadProps {
  customerId: number | null;
  onSealCapture?: (sealImage: string) => void;
  onSealSave?: (sealImage: string) => void;
  initialSealImage?: string | null;
  readOnly?: boolean;
  className?: string;
}

const CustomerSealUpload: React.FC<CustomerSealUploadProps> = ({
  customerId,
  onSealCapture,
  onSealSave,
  initialSealImage,
  readOnly = false,
  className = ""
}) => {
  const [sealImage, setSealImage] = useState<string | null>(initialSealImage || null);
  const [showModal, setShowModal] = useState(false);

  // Update seal image when initialSealImage changes
  React.useEffect(() => {
    if (initialSealImage !== sealImage) {
      setSealImage(initialSealImage || null);
    }
  }, [initialSealImage]);

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Convert to data URL for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSealImage(result);
      onSealCapture?.(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSeal = async () => {
    if (!sealImage || !customerId) return;

    try {
      onSealSave?.(sealImage);
    } catch (error) {
      alert('Failed to save seal. Please try again.');
    }
  };

  const clearSeal = () => {
    setSealImage(null);
    onSealCapture?.('');
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
              onClick={clearSeal}
              className="px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              <X className="w-3 h-3 inline mr-1" />
              Clear
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
              <p>No seal uploaded</p>
              {!readOnly && (
                <div className="flex flex-col items-center space-y-2">
                  <ImageUpload
                    onUpload={handleImageUpload}
                    images={[]} // We only handle one seal image
                    onRemove={() => {}} // Not used for single image
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerSealUpload;
