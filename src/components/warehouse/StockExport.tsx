import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import {
  FileText,
  FileSpreadsheet,
  File,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface ApiResponse {
  success: boolean;
  data?: AvailableStock[];
  error?: string;
}

interface AvailableStock {
  spare_id: number;
  name: string;
  part_number: string;
  brand: string;
  description: string;
  price: number;
  total_quantity: number;
  available_quantity: number;
  issued_quantity: number;
  consumed_quantity: number;
  returned_quantity: number;
  minimum_stock_level: number;
  available_items_count: number;
  stock_status: 'low' | 'normal';
  last_updated: string | null;
}

interface StockExportProps {
  isOpen: boolean;
  onClose: () => void;
}

const StockExport: React.FC<StockExportProps> = ({ isOpen, onClose }) => {
  const [availableStock, setAvailableStock] = useState<AvailableStock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAvailableStock();
    }
  }, [isOpen]);

  const loadAvailableStock = async () => {
    setIsLoading(true);
    try {
      console.log('Making API request to /warehouse/available-stock.php');
      const response = await api.request<ApiResponse>('/warehouse/available-stock.php');
      console.log('Raw API response:', response);

      // Check if response exists and has the expected structure
      if (response && typeof response === 'object') {
        if (response.success && Array.isArray(response.data)) {
          console.log('Setting available stock data:', response.data.length, 'items');
          setAvailableStock(response.data);
        } else if (response.error) {
          console.error('API returned error:', response.error);
          setMessage({
            type: 'error',
            text: response.error || 'Failed to load available stock'
          });
        } else {
          console.error('Unexpected API response structure:', response);
          setMessage({
            type: 'error',
            text: 'Unexpected response format from server'
          });
        }
      } else {
        console.error('Invalid response type:', typeof response, response);
        setMessage({
          type: 'error',
          text: 'Invalid response from server'
        });
      }
    } catch (error: any) {
      console.error('API request failed:', error);

      // Provide more specific error messages
      if (error.message?.includes('401')) {
        setMessage({
          type: 'error',
          text: 'Authentication required. Please log in again.'
        });
      } else if (error.message?.includes('Network')) {
        setMessage({
          type: 'error',
          text: 'Network error. Please check your connection.'
        });
      } else {
        setMessage({
          type: 'error',
          text: `Server error: ${error.message || 'Unknown error'}`
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    setExportLoading('csv');
    try {
      const headers = [
        'Spare ID',
        'Name',
        'Part Number',
        'Brand',
        'Description',
        'Price',
        'Total Quantity',
        'Available Quantity',
        'Issued Quantity',
        'Consumed Quantity',
        'Returned Quantity',
        'Minimum Stock Level',
        'Available Items Count',
        'Stock Status',
        'Last Updated'
      ];

      const csvContent = [
        headers.join(','),
        ...availableStock.map(stock => [
          stock.spare_id,
          `"${stock.name}"`,
          `"${stock.part_number}"`,
          `"${stock.brand || ''}"`,
          `"${stock.description || ''}"`,
          stock.price,
          stock.total_quantity,
          stock.available_quantity,
          stock.issued_quantity,
          stock.consumed_quantity,
          stock.returned_quantity,
          stock.minimum_stock_level,
          stock.available_items_count,
          stock.stock_status,
          stock.last_updated || ''
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `available_stock_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMessage({ type: 'success', text: 'CSV exported successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export CSV' });
    } finally {
      setExportLoading(null);
    }
  };

  const exportToExcel = () => {
    setExportLoading('excel');
    try {
      // For a simple Excel export, we'll create a CSV with Excel formatting
      const headers = [
        'Spare ID\tName\tPart Number\tBrand\tDescription\tPrice\tTotal Quantity\tAvailable Quantity\tIssued Quantity\tConsumed Quantity\tReturned Quantity\tMinimum Stock Level\tAvailable Items Count\tStock Status\tLast Updated'
      ];

      const excelContent = [
        headers.join('\n'),
        ...availableStock.map(stock =>
          [
            stock.spare_id,
            stock.name,
            stock.part_number,
            stock.brand || '',
            stock.description || '',
            stock.price,
            stock.total_quantity,
            stock.available_quantity,
            stock.issued_quantity,
            stock.consumed_quantity,
            stock.returned_quantity,
            stock.minimum_stock_level,
            stock.available_items_count,
            stock.stock_status,
            stock.last_updated || ''
          ].join('\t')
        )
      ].join('\n');

      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `available_stock_${new Date().toISOString().split('T')[0]}.xls`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMessage({ type: 'success', text: 'Excel file exported successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export Excel file' });
    } finally {
      setExportLoading(null);
    }
  };

  const exportToPDF = () => {
    setExportLoading('pdf');
    try {
      // Create a simple HTML table for PDF generation
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Available Stock Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .low-stock { color: #e74c3c; font-weight: bold; }
            .normal-stock { color: #27ae60; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Available Stock Report</h1>
          <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Total Items:</strong> ${availableStock.length}</p>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Part Number</th>
                <th>Brand</th>
                <th>Available Qty</th>
                <th>Total Qty</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${availableStock.map(stock => `
                <tr>
                  <td>${stock.name}</td>
                  <td>${stock.part_number}</td>
                  <td>${stock.brand || '-'}</td>
                  <td>${stock.available_quantity}</td>
                  <td>${stock.total_quantity}</td>
                  <td>$${stock.price.toFixed(2)}</td>
                  <td class="${stock.stock_status}-stock">${stock.stock_status.toUpperCase()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();

      setMessage({ type: 'success', text: 'PDF exported successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export PDF' });
    } finally {
      setExportLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Export Available Stock</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span>{message.text}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Loading available stock...</span>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-gray-600 mb-2">
                  Found {availableStock.length} items in available stock
                </p>
                <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  {availableStock.slice(0, 5).map((stock) => (
                    <div key={stock.spare_id} className="flex justify-between items-center py-1">
                      <span className="text-sm">{stock.name}</span>
                      <span className={`text-sm font-medium ${
                        stock.stock_status === 'low' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {stock.available_quantity} available
                      </span>
                    </div>
                  ))}
                  {availableStock.length > 5 && (
                    <p className="text-sm text-gray-500 mt-2">
                      ... and {availableStock.length - 5} more items
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={exportToCSV}
                  disabled={exportLoading !== null}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {exportLoading === 'csv' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <File className="w-5 h-5" />
                  )}
                  <span>Export to CSV</span>
                </button>

                <button
                  onClick={exportToExcel}
                  disabled={exportLoading !== null}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {exportLoading === 'excel' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-5 h-5" />
                  )}
                  <span>Export to Excel</span>
                </button>

                <button
                  onClick={exportToPDF}
                  disabled={exportLoading !== null}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {exportLoading === 'pdf' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                  <span>Export to PDF</span>
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockExport;
