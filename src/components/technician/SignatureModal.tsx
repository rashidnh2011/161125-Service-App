import React, { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, RotateCcw, Check } from 'lucide-react';

interface SignatureModalProps {
  title: string;
  onSave: (signature: string) => void;
  onClose: () => void;
  onPreview?: () => void;
}

const SignatureModal: React.FC<SignatureModalProps> = ({ title, onSave, onClose, onPreview }) => {
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile devices
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleClear = () => {
    sigCanvasRef.current?.clear();
  };

  const handleSave = () => {
    if (sigCanvasRef.current?.isEmpty()) {
      alert('Please provide a signature before saving.');
      return;
    }

    const signature = sigCanvasRef.current?.toDataURL();
    if (signature) {
      onSave(signature);
    }
  };

  // Mobile-optimized canvas dimensions
  const getCanvasDimensions = () => {
    if (isMobile) {
      return {
        width: Math.min(window.innerWidth - 40, 400),
        height: 200
      };
    }
    return {
      width: 500,
      height: 200
    };
  };

  const canvasProps = getCanvasDimensions();

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isMobile ? 'p-0' : 'p-4'}`}>
      <div className={`bg-white rounded-lg ${isMobile ? 'w-full h-full max-w-none mx-0 max-h-none' : 'max-w-2xl w-full mx-4 max-h-[90vh]'} overflow-hidden`}>
        <div className={`${isMobile ? 'flex items-center justify-between p-4 border-b border-gray-200' : 'flex items-center justify-between p-4 border-b border-gray-200'}`}>
          <h3 className={`font-semibold text-gray-900 ${isMobile ? 'text-lg' : 'text-lg'}`}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className={`text-gray-400 hover:text-gray-600 ${isMobile ? 'p-2' : ''}`}
          >
            <X className={`${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`} />
          </button>
        </div>

        <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
            <SignatureCanvas
              ref={sigCanvasRef}
              canvasProps={{
                width: canvasProps.width,
                height: canvasProps.height,
                className: `signature-canvas ${isMobile ? 'touch-optimized' : ''}`,
                style: {
                  width: `${canvasProps.width}px`,
                  height: `${canvasProps.height}px`,
                  touchAction: 'none' // Prevent scrolling while drawing
                }
              }}
              backgroundColor="white"
            />
          </div>

          <p className={`text-gray-600 mt-2 text-center ${isMobile ? 'text-base' : 'text-sm'}`}>
            {isMobile
              ? 'Use your finger or stylus to sign above'
              : 'Sign above using your finger or stylus'
            }
          </p>

          <div className={`flex items-center justify-between mt-6 ${isMobile ? 'flex-col space-y-4' : ''}`}>
            <button
              onClick={handleClear}
              className={`flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
                isMobile ? 'w-full justify-center text-base min-h-[48px]' : ''
              }`}
            >
              <RotateCcw className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
              <span>Clear</span>
            </button>

            <div className={`flex items-center space-x-3 ${isMobile ? 'w-full' : ''}`}>
              <button
                onClick={onClose}
                className={`px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
                  isMobile ? 'flex-1 min-h-[48px] text-base' : ''
                }`}
              >
                Cancel
              </button>

              {onPreview && (
                <button
                  onClick={onPreview}
                  className={`px-6 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors ${
                    isMobile ? 'flex-1 min-h-[48px] text-base' : ''
                  }`}
                >
                  Preview Report
                </button>
              )}

              <button
                onClick={handleSave}
                className={`flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
                  isMobile ? 'flex-1 justify-center min-h-[48px] text-base' : ''
                }`}
              >
                <Check className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`} />
                <span>Save Signature</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;