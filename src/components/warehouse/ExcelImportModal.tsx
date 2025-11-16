import React, { useState, useRef } from 'react';
import { api } from '../../utils/api';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from 'lucide-react';

interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  failed: number;
  errors: string[];
}

interface ExcelImportModalProps {
  onImportComplete: () => void;
  onClose: () => void;
}

const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ onImportComplete, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      alert('Please select a valid Excel file (.xlsx, .xls) or CSV file.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return;
    }

    setSelectedFile(file);
    setImportResult(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('excelFile', selectedFile);

      const response = await api.request('/spares/import.php', {
        method: 'POST',
        body: formData,
        headers: {
          // Don't set Content-Type, let the browser set it with boundary for FormData
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      }) as ImportResult;

      setImportResult(response);

      if (response.imported > 0) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Import failed:', error);

      let errorMessage = 'Failed to import file. Please check the file format and try again.';

      // Check for specific error types and provide more helpful messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error: Please check your internet connection and try again.';
      } else if (error.message.includes('401')) {
        errorMessage = 'Authentication error: Please log in again.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error: Please check if PHP and required dependencies are installed on the server.';
      } else if (error.message.includes('404')) {
        errorMessage = 'Import endpoint not found: Please contact your administrator.';
      } else if (error.message) {
        // Use the actual error message if available
        errorMessage = error.message;
      }

      setImportResult({
        success: false,
        total: 0,
        imported: 0,
        failed: 1,
        errors: [errorMessage]
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Create a sample Excel file content
    const csvContent = "name,part_number,brand,price,description\n" +
                      "Sample Spare 1,SP001,DIGI,100.00,Sample spare part 1\n" +
                      "Sample Spare 2,SP002,EPSON,150.50,Sample spare part 2\n" +
                      "Sample Spare 3,SP003,CANON,75.25,Sample spare part 3";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'spare_parts_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Import Spare Parts</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!selectedFile ? (
            <div className="space-y-6">
              {/* File Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop your Excel file here or click to browse
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Supports .xlsx, .xls, and .csv files (max 10MB)
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {/* Format Instructions */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Expected Format:</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Columns (in order):</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li><code>name</code> - Spare part name (required)</li>
                    <li><code>part_number</code> - Part number (required, must be unique)</li>
                    <li><code>brand</code> - Brand name (optional)</li>
                    <li><code>price</code> - Price in AED (required, must be ≥ 0)</li>
                    <li><code>description</code> - Description (optional)</li>
                  </ol>
                </div>
                <div className="mt-4">
                  <button
                    onClick={downloadTemplate}
                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CSV Template</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Selected File Info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">File Selected:</span>
                  <span className="text-green-700">{selectedFile.name}</span>
                  <span className="text-green-600 text-sm">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>

              {/* Upload Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? 'Importing...' : 'Import Spare Parts'}</span>
                </button>
              </div>

              {/* Progress Indicator */}
              {isUploading && (
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Processing file...</span>
                  </div>
                </div>
              )}

              {/* Import Results */}
              {importResult && (
                <div className={`rounded-lg p-4 ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    {importResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <h4 className={`font-medium ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      Import Results
                    </h4>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{importResult.total}</div>
                      <div className="text-sm text-gray-600">Total Rows</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                      <div className="text-sm text-gray-600">Imported</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                      <div className="text-sm text-gray-600">Failed</div>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div>
                      <h5 className="font-medium text-red-800 mb-2">Errors:</h5>
                      <div className="max-h-32 overflow-y-auto bg-red-100 rounded p-3">
                        {importResult.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-700 mb-1">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between">
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setImportResult(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Import Another File
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelImportModal;
