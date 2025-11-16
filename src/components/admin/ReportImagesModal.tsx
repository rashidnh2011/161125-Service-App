import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { ServiceReport, ApiResponse } from '../../types';
import { X, Download, ZoomIn } from 'lucide-react';

interface ReportImagesModalProps {
  reportId: number;
  onClose: () => void;
}

const ReportImagesModal: React.FC<ReportImagesModalProps> = ({ reportId, onClose }) => {
  const [report, setReport] = useState<ServiceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const response: ApiResponse<ServiceReport> = await api.getServiceReport(reportId);
      if (response.success && response.data) {
        setReport(response.data);
      }
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadImage = (imagePath: string) => {
    const link = document.createElement('a');
    link.href = `/api/uploads/${imagePath}`;
    link.download = imagePath;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAllImages = () => {
    if (!report?.items) return [];
    
    const images: Array<{ path: string; type: string; itemIndex: number }> = [];
    
    report.items.forEach((item, itemIndex) => {
      item.before_images?.forEach(image => {
        images.push({ path: image, type: 'Before', itemIndex });
      });
      
      item.after_images?.forEach(image => {
        images.push({ path: image, type: 'After', itemIndex });
      });
      
      item.spares?.forEach(spare => {
        if (spare.spare_image) {
          images.push({ path: spare.spare_image, type: 'Spare', itemIndex });
        }
      });
    });
    
    return images;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  const allImages = getAllImages();

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Report Images - #{report?.report_number}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            {allImages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No images found for this report.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allImages.map((image, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="aspect-w-16 aspect-h-12 mb-3">
                      <img
                        src={`/api/uploads/${image.path}`}
                        alt={`${image.type} - Item ${image.itemIndex + 1}`}
                        className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedImage(`/api/uploads/${image.path}`)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {image.type} Image
                        </p>
                        <p className="text-xs text-gray-500">
                          Item {image.itemIndex + 1}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedImage(`/api/uploads/${image.path}`)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Full Size"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDownloadImage(image.path)}
                          className="text-green-600 hover:text-green-800"
                          title="Download Image"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-60">
          <div className="relative max-w-full max-h-full p-4">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="w-8 h-8" />
            </button>
            
            <img
              src={selectedImage}
              alt="Full size view"
              className="max-w-full max-h-full object-contain"
              onClick={() => setSelectedImage(null)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ReportImagesModal;