import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { ServiceReport, ServiceItem, Spare, Item } from '../../types';
import { X, Save, PenTool as Signature, Plus, Minus } from 'lucide-react';
import SignatureModal from './SignatureModal';
import ImageUpload from './ImageUpload';
import SmartTextInput from '../common/SmartTextInout';
import { usePhraseManager } from '../../utils/PhraseManager';
import { SERVICE_TEMPLATES, COMMON_PHRASES } from '../../data/ServiceTemplates';
import ItemSelector from './ItemSelector';

interface EditServiceReportProps {
  reportId: number;
  onSave: () => void;
  onClose: () => void;
}

const EditServiceReport: React.FC<EditServiceReportProps> = ({ reportId, onSave, onClose }) => {
  const { user } = useAuth();
  const [report, setReport] = useState<ServiceReport | null>(null);
  const [spares, setSpares] = useState<Spare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState<{type: 'engineer' | 'customer'; show: boolean}>({ type: 'engineer', show: false });
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showItemSelector, setShowItemSelector] = useState<{show: boolean; itemIndex: number}>({ show: false, itemIndex: -1 });
  const phraseManager = usePhraseManager();

  useEffect(() => {
    loadData();
  }, [reportId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reportRes, sparesRes] = await Promise.all([
        api.getServiceReport(reportId),
        api.getSpares()
      ]) as [any, any];

      if (reportRes.success && reportRes.data) {
        setReport(reportRes.data);
      }
      if (sparesRes.success) {
        setSpares(sparesRes.data || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setMessage({ type: 'error', text: 'Failed to load report data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignatureSave = (signature: string, type: 'engineer' | 'customer') => {
    if (!report) return;
    
    setReport(prev => prev ? {
      ...prev,
      [type === 'engineer' ? 'engineer_signature' : 'customer_signature']: signature
    } : null);
    setShowSignatureModal({ type: 'engineer', show: false });
  };

  const handleImageUpload = async (file: File, itemIndex: number, imageType: 'before' | 'after') => {
    try {
      const response = await api.uploadImage(file);
      if (response.success && response.filename && report) {
        const updatedItems = [...(report.items || [])];
        if (imageType === 'before') {
          updatedItems[itemIndex].before_images = [...(updatedItems[itemIndex].before_images || []), response.filename];
        } else {
          updatedItems[itemIndex].after_images = [...(updatedItems[itemIndex].after_images || []), response.filename];
        }
        setReport(prev => prev ? { ...prev, items: updatedItems } : null);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  };

  const addServiceItem = () => {
    if (!report) return;
    const updatedItems = [...(report.items || [])];
    const newItem: Partial<ServiceItem> = {
      id: 0,
      complaint: '',
      diagnostics: '',
      action_taken: '',
      notes: '',
      before_images: [],
      after_images: [],
      spares: []
    };
    updatedItems.push(newItem as ServiceItem);
    setReport(prev => prev ? { ...prev, items: updatedItems } : null);
    setExpandedIndex(updatedItems.length - 1);
  };

  const removeImage = (itemIndex: number, imageIndex: number, imageType: 'before' | 'after') => {
    if (!report) return;
    
    const updatedItems = [...(report.items || [])];
    if (imageType === 'before') {
      updatedItems[itemIndex].before_images?.splice(imageIndex, 1);
    } else {
      updatedItems[itemIndex].after_images?.splice(imageIndex, 1);
    }
    setReport(prev => prev ? { ...prev, items: updatedItems } : null);
  };

  const updateServiceItem = (itemIndex: number, field: keyof ServiceItem, value: any) => {
    if (!report) return;
    
    const updatedItems = [...(report.items || [])];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], [field]: value };
    setReport(prev => prev ? { ...prev, items: updatedItems } : null);
  };

  const addSpareToItem = (itemIndex: number) => {
    if (!report) return;
    
    const updatedItems = [...(report.items || [])];
    if (!updatedItems[itemIndex].spares) {
      updatedItems[itemIndex].spares = [];
    }
    updatedItems[itemIndex].spares!.push({
      id: 0,
      service_item_id: updatedItems[itemIndex].id,
      spare_id: 0,
      quantity: 1,
      price: 0
    });
    setReport(prev => prev ? { ...prev, items: updatedItems } : null);
  };

  const removeSpareFromItem = (itemIndex: number, spareIndex: number) => {
    if (!report) return;
    
    const updatedItems = [...(report.items || [])];
    updatedItems[itemIndex].spares?.splice(spareIndex, 1);
    setReport(prev => prev ? { ...prev, items: updatedItems } : null);
  };

  const updateSpare = (itemIndex: number, spareIndex: number, field: string, value: any) => {
    if (!report) return;
    
    const updatedItems = [...(report.items || [])];
    if (updatedItems[itemIndex].spares) {
      updatedItems[itemIndex].spares![spareIndex] = { 
        ...updatedItems[itemIndex].spares![spareIndex], 
        [field]: value 
      };
      
      if (field === 'spare_id') {
        const spare = spares.find(s => s.id === parseInt(value));
        if (spare) {
          updatedItems[itemIndex].spares![spareIndex].price = spare.price;
        }
      }
    }
    setReport(prev => prev ? { ...prev, items: updatedItems } : null);
  };

  const handleItemSelect = (item: Item | null, manualData?: any) => {
    if (!report) return;
    const idx = showItemSelector.itemIndex;
    const updatedItems = [...(report.items || [])];
    if (idx < 0 || idx >= updatedItems.length) {
      setShowItemSelector({ show: false, itemIndex: -1 });
      return;
    }
    if (item) {
      updatedItems[idx].item_id = item.id;
      updatedItems[idx].item = item;
      updatedItems[idx].manual_item_data = undefined;
    } else if (manualData) {
      updatedItems[idx].item_id = undefined;
      delete updatedItems[idx].item;
      updatedItems[idx].manual_item_data = manualData;
    }
    setReport(prev => prev ? { ...prev, items: updatedItems } : null);
    setShowItemSelector({ show: false, itemIndex: -1 });
  };

  const handleSave = async () => {
    if (!report) return;

    // Validate signatures for completion and one-time reports
    if ((report.type === 'completion' || report.type === 'one_time') && 
        (!report.engineer_signature || !report.customer_signature)) {
      setMessage({ type: 'error', text: 'Both engineer and customer signatures are required' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response: any = await api.updateServiceReport(report.id, {
        visit_date: report.visit_date,
        status: report.status,
        engineer_signature: report.engineer_signature,
        customer_signature: report.customer_signature,
        notes: report.notes,
        items: report.items
      });

      if (response.success) {
        setMessage({ type: 'success', text: 'Service report updated successfully!' });
        setTimeout(() => {
          onSave();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to update service report' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update service report' });
    } finally {
      setIsSaving(false);
    }
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

  if (!report) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-red-600">Failed to load report data</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-600 text-white rounded">Close</button>
        </div>
      </div>
    );
  }

  const canEdit = report.can_edit || user?.role === 'admin';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Edit Service Report #{report.report_number}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
            {message && (
              <div className={`p-4 rounded-lg mb-6 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            {!canEdit && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
                <p className="text-yellow-800">This report is locked and cannot be edited.</p>
              </div>
            )}

            {/* Report Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Report Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date</label>
                  <input
                    type="date"
                    value={report.visit_date}
                    onChange={(e) => setReport(prev => prev ? { ...prev, visit_date: e.target.value } : null)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={report.status}
                    onChange={(e) => setReport(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="draft">Draft</option>
                    <option value="inspection">Inspection</option>
                    <option value="completed">Completed</option>
                    <option value="sent">Sent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <input
                    type="text"
                    value={report.type}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 capitalize"
                  />
                </div>
              </div>
            </div>

            {/* Service Items */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">Service Items</h4>
                {canEdit && (
                  <button
                    onClick={addServiceItem}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </button>
                )}
              </div>
              {report.items?.map((item, itemIndex) => (
                <div key={item.id || itemIndex} className="bg-gray-50 rounded-lg p-4">
                  {expandedIndex !== null && expandedIndex !== itemIndex ? (
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-sm text-gray-700 truncate">
                        <span className="font-medium">Item {itemIndex + 1}:</span>{' '}
                        {item.item
                          ? `${item.item.model} - ${item.item.serial_number}`
                          : item.manual_item_data
                            ? `${item.manual_item_data.brand} ${item.manual_item_data.model} - ${item.manual_item_data.serial_number}`
                            : 'No item details available'}
                        {item.complaint ? ` — ${item.complaint}` : ''}
                      </div>
                      <button
                        onClick={() => setExpandedIndex(itemIndex)}
                        className="ml-3 inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white hover:bg-blue-700"
                        title="Expand"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white rounded-lg p-3 mb-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">Item Details</h5>
                          {canEdit && (
                            <button
                              onClick={() => setShowItemSelector({ show: true, itemIndex })}
                              className="px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                            >
                              Select Item
                            </button>
                          )}
                        </div>
                        {item.item ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">Type:</span>
                              <div className="font-medium capitalize">{item.item.item_type}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Brand:</span>
                              <div className="font-medium">{item.item.brand}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Model:</span>
                              <div className="font-medium">{item.item.model}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Serial Number:</span>
                              <div className="font-medium">{item.item.serial_number}</div>
                            </div>
                            {item.item.department && (
                              <div>
                                <span className="text-gray-500">Department:</span>
                                <div className="font-medium">{item.item.department}</div>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-500">Purchase Type:</span>
                              <div className={`font-medium ${item.item.purchase_type === 'purchased_us' ? 'text-green-600' : 'text-orange-600'}`}>
                                {item.item.purchase_type === 'purchased_us' ? 'Our Product' : 'Third Party'}
                              </div>
                            </div>
                          </div>
                        ) : item.manual_item_data ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">Type:</span>
                              <div className="font-medium capitalize">{item.manual_item_data.item_type}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Brand:</span>
                              <div className="font-medium">{item.manual_item_data.brand}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Model:</span>
                              <div className="font-medium">{item.manual_item_data.model}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Serial Number:</span>
                              <div className="font-medium">{item.manual_item_data.serial_number}</div>
                            </div>
                            {item.manual_item_data.department && (
                              <div>
                                <span className="text-gray-500">Department:</span>
                                <div className="font-medium">{item.manual_item_data.department}</div>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-500">Purchase Type:</span>
                              <div className={`font-medium ${item.manual_item_data.purchase_type === 'purchased_us' ? 'text-green-600' : 'text-orange-600'}`}>
                                {item.manual_item_data.purchase_type === 'purchased_us' ? 'Our Product' : 'Third Party'}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-gray-500 text-sm">No item details available</div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <SmartTextInput
                            label="Complaint"
                            value={item.complaint}
                            onChange={(value) => updateServiceItem(itemIndex, 'complaint' as keyof ServiceItem, value)}
                            category="complaint"
                            suggestions={[...COMMON_PHRASES.complaints, ...phraseManager.getSuggestionsForCategory('complaints')]}
                            templates={SERVICE_TEMPLATES.filter(t => t.category === 'complaint')}
                            placeholder="Describe the issue or problem"
                            required
                            disabled={!canEdit || report.type === 'completion'}
                            rows={3}
                          />
                          {report.type === 'completion' && (
                            <p className="text-xs text-gray-500 mt-1">From inspection report</p>
                          )}
                        </div>
                        <div>
                          <SmartTextInput
                            label="Diagnostics"
                            value={item.diagnostics || ''}
                            onChange={(value) => updateServiceItem(itemIndex, 'diagnostics' as keyof ServiceItem, value)}
                            category="diagnostics"
                            suggestions={[...COMMON_PHRASES.diagnostics, ...phraseManager.getSuggestionsForCategory('diagnostics')]}
                            templates={SERVICE_TEMPLATES.filter(t => t.category === 'diagnostics')}
                            placeholder="Diagnostic findings and observations"
                            disabled={!canEdit || report.type === 'completion'}
                            rows={3}
                          />
                          {report.type === 'completion' && (
                            <p className="text-xs text-gray-500 mt-1">From inspection report</p>
                          )}
                        </div>
                        <div>
                          <SmartTextInput
                            label="Action Taken"
                            value={item.action_taken}
                            onChange={(value) => updateServiceItem(itemIndex, 'action_taken' as keyof ServiceItem, value)}
                            category="action_taken"
                            suggestions={[...COMMON_PHRASES.actions, ...phraseManager.getSuggestionsForCategory('actions')]}
                            templates={SERVICE_TEMPLATES.filter(t => t.category === 'action_taken')}
                            placeholder={report.type === 'completion' ? 'Describe the repair/completion work done' : 'Describe the action taken'}
                            required
                            disabled={!canEdit}
                            rows={4}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Before Images</label>
                          {canEdit ? (
                            <ImageUpload
                              onUpload={(file) => handleImageUpload(file, itemIndex, 'before')}
                              images={item.before_images || []}
                              onRemove={(imageIndex) => removeImage(itemIndex, imageIndex, 'before')}
                            />
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {item.before_images?.map((image, idx) => (
                                <img
                                  key={idx}
                                  src={`/api/uploads/${image}`}
                                  alt={`Before ${idx + 1}`}
                                  className="w-full h-24 object-cover rounded border"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">After Images</label>
                          {canEdit ? (
                            <ImageUpload
                              onUpload={(file) => handleImageUpload(file, itemIndex, 'after')}
                              images={item.after_images || []}
                              onRemove={(imageIndex) => removeImage(itemIndex, imageIndex, 'after')}
                            />
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {item.after_images?.map((image, idx) => (
                                <img
                                  key={idx}
                                  src={`/api/uploads/${image}`}
                                  alt={`After ${idx + 1}`}
                                  className="w-full h-24 object-cover rounded border"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">Spares Used</label>
                          {canEdit && (
                            <button
                              onClick={() => addSpareToItem(itemIndex)}
                              className="flex items-center space-x-1 px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Spare</span>
                            </button>
                          )}
                        </div>

                        {item.spares?.map((spare, spareIndex) => (
                          <div key={spareIndex} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                            <select
                              value={spare.spare_id}
                              onChange={(e) => updateSpare(itemIndex, spareIndex, 'spare_id', parseInt(e.target.value))}
                              disabled={!canEdit}
                              className="px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                            >
                              <option value="">Select Spare</option>
                              {spares.map(sp => (
                                <option key={sp.id} value={sp.id}>{sp.name} - {sp.part_number}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              placeholder="Qty"
                              value={spare.quantity}
                              onChange={(e) => updateSpare(itemIndex, spareIndex, 'quantity', parseInt(e.target.value))}
                              disabled={!canEdit}
                              className="px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                              min="1"
                            />
                            <input
                              type="number"
                              placeholder="Price"
                              value={spare.price}
                              onChange={(e) => updateSpare(itemIndex, spareIndex, 'price', parseFloat(e.target.value))}
                              disabled={!canEdit}
                              className="px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                              step="0.01"
                            />
                            {canEdit && (
                              <button
                                onClick={() => removeSpareFromItem(itemIndex, spareIndex)}
                                className="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Signatures */}
            {(report.type === 'completion' || report.type === 'one_time') && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-4">Signatures</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Engineer Signature *</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      {report.engineer_signature ? (
                        <div>
                          <img src={report.engineer_signature} alt="Engineer Signature" className="max-w-full h-20 mx-auto" />
                          {canEdit && (
                            <button
                              onClick={() => setShowSignatureModal({ type: 'engineer', show: true })}
                              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                              Update Signature
                            </button>
                          )}
                        </div>
                      ) : canEdit ? (
                        <button
                          onClick={() => setShowSignatureModal({ type: 'engineer', show: true })}
                          className="flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800"
                        >
                          <Signature className="w-5 h-5" />
                          <span>Add Engineer Signature</span>
                        </button>
                      ) : (
                        <p className="text-gray-500">No signature</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer Signature *</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      {report.customer_signature ? (
                        <div>
                          <img src={report.customer_signature} alt="Customer Signature" className="max-w-full h-20 mx-auto" />
                          {canEdit && (
                            <button
                              onClick={() => setShowSignatureModal({ type: 'customer', show: true })}
                              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                            >
                              Update Signature
                            </button>
                          )}
                        </div>
                      ) : canEdit ? (
                        <button
                          onClick={() => setShowSignatureModal({ type: 'customer', show: true })}
                          className="flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800"
                        >
                          <Signature className="w-5 h-5" />
                          <span>Add Customer Signature</span>
                        </button>
                      ) : (
                        <p className="text-gray-500">No signature</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={report.notes || ''}
                onChange={(e) => setReport(prev => prev ? { ...prev, notes: e.target.value } : null)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                rows={4}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            {canEdit && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {showSignatureModal.show && (
        <SignatureModal
          title={`${showSignatureModal.type === 'engineer' ? 'Engineer' : 'Customer'} Signature`}
          onSave={(signature) => handleSignatureSave(signature, showSignatureModal.type)}
          onClose={() => setShowSignatureModal({ type: 'engineer', show: false })}
        />
      )}

      {showItemSelector.show && report && (
        <ItemSelector
          customerId={report.customer_id}
          onSelect={handleItemSelect}
          onClose={() => setShowItemSelector({ show: false, itemIndex: -1 })}
        />
      )}
    </>
  );
};

export default EditServiceReport;