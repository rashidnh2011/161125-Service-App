import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: { name: string; city?: string } | null;
  reportType: 'inspection' | 'completion' | 'one_time';
  visitDate: string;
  items: any[];
  itemsCatalog: Array<{ id: number; model?: string; serial_number?: string }>;
  notes: string;
  invoiceData: any;
  engineerSignature?: string;
  customerSignature?: string;
  signaturePersonName?: string;
  signaturePersonContact?: string;
}

const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  customer,
  reportType,
  visitDate,
  items,
  itemsCatalog,
  notes,
  invoiceData,
  engineerSignature,
  customerSignature,
  signaturePersonName,
  signaturePersonContact,
}) => {
  const [viewerSrc, setViewerSrc] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string>('');

  const resolveSrc = (image: string) => {
    if (!image) return '';
    if (image.startsWith('data:') || image.startsWith('http') || image.startsWith('/api/uploads/')) return image;
    return `/api/uploads/${image}`;
  };

  const openViewer = (src: string, title: string) => {
    setViewerSrc(src);
    setViewerTitle(title);
  };

  if (!isOpen) return null;

  const getItemLabel = (item: any) => {
    if (item.item_id) {
      const found = itemsCatalog.find(i => i.id === item.item_id);
      if (found) {
        return `${found.model || 'Item'}${found.serial_number ? ' - ' + found.serial_number : ''}`;
      }
    }
    if (item.manual_item_data) {
      const m = item.manual_item_data;
      return `${m.brand || ''} ${m.model || ''}${m.serial_number ? ' - ' + m.serial_number : ''}`.trim();
    }
    return 'No item selected';
  };

  const typeLabel = reportType === 'one_time' ? 'One-Time Service' : reportType === 'inspection' ? 'Initial Inspection' : 'Completion Visit';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Service Report Preview</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded border">
              <div className="text-xs text-gray-500">Customer</div>
              <div className="text-sm font-medium text-gray-900">{customer?.name || 'Not selected'}</div>
              {customer?.city && <div className="text-xs text-gray-500">{customer.city}</div>}
            </div>
            <div className="p-3 bg-gray-50 rounded border">
              <div className="text-xs text-gray-500">Report Type</div>
              <div className="text-sm font-medium text-gray-900">{typeLabel}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded border">
              <div className="text-xs text-gray-500">Visit Date</div>
              <div className="text-sm font-medium text-gray-900">{visitDate}</div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Service Items ({items.length})</h4>
            {items.length === 0 ? (
              <div className="text-sm text-gray-500">No items added</div>
            ) : (
              <div className="space-y-4">
                {items.map((it, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-900">Item {idx + 1}: {getItemLabel(it)}</div>
                      <div className="text-xs text-gray-500">
                        {it.amc_visit ? 'AMC' : it.warranty_flag ? 'Warranty' : it.installation ? 'Installation' : 'Regular'}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
                      <div>
                        <div className="text-gray-500">Complaint</div>
                        <div className="text-gray-900 whitespace-pre-wrap">{it.complaint || '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Diagnostics</div>
                        <div className="text-gray-900 whitespace-pre-wrap">{it.diagnostics || '-'}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Action Taken</div>
                        <div className="text-gray-900 whitespace-pre-wrap">{it.action_taken || '-'}</div>
                      </div>
                    </div>
                    {(it.spares && it.spares.length > 0) && (
                      <div className="mt-3 text-sm">
                        <div className="text-gray-500">Spares</div>
                        <div className="text-gray-900">{it.spares.map((s: any) => `${s.quantity} x ${s.spare_id || 'Spare'}${s.price ? ` (AED ${s.price})` : ''}`).join(', ')}</div>
                      </div>
                    )}

                    {(it.before_images && it.before_images.length > 0) && (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-gray-900 mb-2">Before Images</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {it.before_images.map((img: string, bIdx: number) => (
                            <button
                              key={`b-${bIdx}`}
                              type="button"
                              onClick={() => openViewer(resolveSrc(img), `Before Image ${bIdx + 1}`)}
                              className="block focus:outline-none"
                              title="View"
                            >
                              <img
                                src={resolveSrc(img)}
                                alt={`Before ${bIdx + 1}`}
                                className="w-full h-24 object-cover rounded border border-gray-200 cursor-zoom-in"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {(it.after_images && it.after_images.length > 0) && (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-gray-900 mb-2">After Images</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {it.after_images.map((img: string, aIdx: number) => (
                            <button
                              key={`a-${aIdx}`}
                              type="button"
                              onClick={() => openViewer(resolveSrc(img), `After Image ${aIdx + 1}`)}
                              className="block focus:outline-none"
                              title="View"
                            >
                              <img
                                src={resolveSrc(img)}
                                alt={`After ${aIdx + 1}`}
                                className="w-full h-24 object-cover rounded border border-gray-200 cursor-zoom-in"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">General Notes</h4>
            <div className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 border rounded p-3 min-h-[48px]">
              {notes || '-'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded border">
              <div className="text-xs text-gray-500 mb-1">Signatures</div>
              <div className="text-sm text-gray-900">Engineer: {engineerSignature ? 'Provided' : 'Not provided'}</div>
              <div className="text-sm text-gray-900">Customer: {customerSignature ? 'Provided' : 'Pending'}</div>
              <div className="text-xs text-gray-500 mt-2">Signer</div>
              <div className="text-sm text-gray-900">{signaturePersonName || '-'}</div>
              {!!signaturePersonContact && (
                <div className="text-sm text-gray-500">{signaturePersonContact}</div>
              )}
            </div>

            <div className="p-3 bg-gray-50 rounded border">
              <div className="text-xs text-gray-500 mb-1">Invoice</div>
              {invoiceData ? (
                <div className="text-sm text-gray-900 space-y-1">
                  <div>Status: {invoiceData.payment_status?.toUpperCase?.() || '-'}</div>
                  <div>Invoice #: {invoiceData.invoice_number || '-'}</div>
                  {invoiceData.payment_status === 'paid' && (
                    <div>Receipt #: {invoiceData.receipt_number || '-'}</div>
                  )}
                  <div>Amount: {invoiceData.amount || '-'}</div>
                  {(invoiceData.unbilled || invoiceData.required_approval) && (
                    <div className="text-xs text-amber-700">{invoiceData.unbilled ? 'Unbilled' : ''} {invoiceData.required_approval ? 'Requires Approval' : ''}</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Not applicable</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button onClick={onClose} className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>

      {/* Fullscreen Image Viewer */}
      {viewerSrc && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]" onClick={() => setViewerSrc(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewerSrc(null)}
              className="absolute -top-10 right-0 text-white/90 hover:text-white"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <img src={viewerSrc} alt={viewerTitle} className="max-w-[90vw] max-h-[85vh] rounded shadow-2xl" />
            {viewerTitle && (
              <div className="mt-3 text-center text-white/90 text-sm">{viewerTitle}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPreviewModal;
