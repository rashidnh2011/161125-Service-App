import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Customer, Item, Spare, TechnicianSpareAssignment } from '../../types';
import { Plus, Minus, Save, PenTool as Signature, Search } from 'lucide-react';
import SignatureModal from './SignatureModal';
import ReportPreviewModal from './ReportPreviewModal';
import ImageUpload from './ImageUpload';
import CustomerSelector from './CustomerSelector';
import ItemSelector from './ItemSelector';
import SendReportModal from './SendReportModal';
import SmartTextInput from '../common/SmartTextInout';
import CustomerSealUpload from './CustomerSealUpload';
import { useAuth } from '../../contexts/AuthContext';
import { usePhraseManager } from '../../utils/PhraseManager';
import { SERVICE_TEMPLATES, COMMON_PHRASES } from '../../data/ServiceTemplates';

interface ServiceItemForm {
  item_id?: number;
  manual_item_data?: {
    item_type: string;
    brand: string;
    model: string;
    serial_number: string;
    department?: string;
    purchase_type: string;
  };
  complaint: string;
  diagnostics: string;
  action_taken: string;
  warranty_flag: boolean;
  installation: boolean;
  amc_visit: boolean;
  notes: string;
  before_images: string[];
  after_images: string[];
  selected_for_completion?: boolean;
  spares: Array<{
    spare_id: number;
    quantity: number;
    price: number;
    spare_image?: string;
    unique_spare_ids?: string[];
    available_unique_ids?: any[];
    status?: string;
  }>;
}

const CreateService: React.FC = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [spares, setSpares] = useState<Spare[]>([]);
  const [assignedSpares, setAssignedSpares] = useState<Spare[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [reportType, setReportType] = useState<'inspection' | 'completion' | 'one_time'>('one_time');
  const [parentReportId, setParentReportId] = useState<number | null>(null);
  const [parentReportNumber, setParentReportNumber] = useState<string>('');
  const [inspectionData, setInspectionData] = useState<any>(null);
  const [isLoadingInspection, setIsLoadingInspection] = useState(false);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [serviceItems, setServiceItems] = useState<ServiceItemForm[]>([]);
  const [engineerSignature, setEngineerSignature] = useState<string>('');
  const [customerSignature, setCustomerSignature] = useState<string>('');
  const [signaturePersonName, setSignaturePersonName] = useState<string>('');
  const [signaturePersonContact, setSignaturePersonContact] = useState<string>('');
  const [invoiceData, setInvoiceData] = useState({
    invoice_number: '',
    receipt_number: '',
    amount: '',
    payment_status: 'unpaid' as 'paid' | 'unpaid',
    unbilled: false,
    required_approval: false
  });
  const [serviceStartTime, setServiceStartTime] = useState<Date | null>(null);
  const [serviceEndTime, setServiceEndTime] = useState<Date | null>(null);
  const [isServiceActive, setIsServiceActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [locationData, setLocationData] = useState<{
    start: { lat: number; lng: number; address?: string; accuracy?: number } | null;
    end: { lat: number; lng: number; address?: string; accuracy?: number } | null;
  }>({ start: null, end: null });
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState<{type: 'engineer' | 'customer'; show: boolean}>({ type: 'engineer', show: false });
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showItemSelector, setShowItemSelector] = useState<{show: boolean; itemIndex: number}>({show: false, itemIndex: -1});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error'; text: string} | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [savedReportData, setSavedReportData] = useState<{id: number; reportNumber: string} | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<any[]>([]);
  const [inspectionReports, setInspectionReports] = useState<Array<{id: number; report_number: string; visit_date: string}>>([]);
  const [isLoadingInspectionReports, setIsLoadingInspectionReports] = useState(false);
  const [customerSeal, setCustomerSeal] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);

  // Autosave functionality
  const [autosaveStatus, setAutosaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null);
  const [autosaveTimer, setAutosaveTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const AUTOSAVE_DELAY = 2000; // 2 seconds delay

  // Initialize phrase manager for learning and suggestions
  const phraseManager = usePhraseManager();

  // Fetch inspection reports when customer is selected and report type is completion
  useEffect(() => {
    const fetchInspectionReports = async () => {
      if (selectedCustomerId && reportType === 'completion') {
        try {
          setIsLoadingInspectionReports(true);
          // Get all inspection reports for the customer using the getReports method
          const response = await api.getReports({ customer_id: selectedCustomerId, type: 'inspection' }) as any;
          if (response && response.success && response.data) {
            // The API already filters by type, so we can use the response directly
            setInspectionReports(Array.isArray(response.data) ? response.data : []);
            
            // Clear any previously selected report when customer changes
            setParentReportNumber('');
            setInspectionData(null);
            setServiceItems([]);
          }
        } catch (error) {
          console.error('Error fetching inspection reports:', error);
          setMessage({ type: 'error', text: 'Failed to load inspection reports' });
        } finally {
          setIsLoadingInspectionReports(false);
        }
      } else {
        setInspectionReports([]);
        setParentReportNumber('');
        setInspectionData(null);
      }
    };

    fetchInspectionReports();
  }, [selectedCustomerId, reportType]);

  useEffect(() => {
    loadInitialData();
    loadAssignedSpares();
    
    // Load saved service session from localStorage
    const savedSession = localStorage.getItem('activeServiceSession');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      setServiceStartTime(new Date(session.startTime));
      setIsServiceActive(true);
      startTimer(new Date(session.startTime));
    }
    
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, []);

  useEffect(() => {
    loadAssignedSpares();
  }, [user?.id]);

  // Check GPS availability on component mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      setGpsEnabled(true);
    } else {
      setLocationError('GPS not available on this device');
    }
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      loadCustomerItems(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  // Load customer seal when customer is selected
  useEffect(() => {
    const loadCustomerSeal = async () => {
      if (selectedCustomerId) {
        try {
          console.log('Loading seal for customer:', selectedCustomerId);
          const response = await api.getCustomerSeal(selectedCustomerId) as any;
          console.log('Seal API response:', response);

          if (response && response.success) {
            if (response.data && response.data.seal_image) {
              // Convert base64 back to data URL if needed
              const sealData = response.data.seal_image;
              console.log('Seal data received:', sealData.substring(0, 50) + '...');

              const sealImageUrl = sealData.startsWith('data:') ? sealData : `data:image/png;base64,${sealData}`;
              console.log('Setting seal image URL:', sealImageUrl.substring(0, 50) + '...');
              setCustomerSeal(sealImageUrl);
            } else {
              console.log('No seal image data found');
              setCustomerSeal(null);
            }
          } else {
            console.log('Seal API response failed or no data');
            setCustomerSeal(null);
          }
        } catch (error) {
          console.error('Error loading customer seal:', error);
          setCustomerSeal(null);
        }
      } else {
        console.log('No customer selected, clearing seal');
        setCustomerSeal(null);
      }
    };

    loadCustomerSeal();
  }, [selectedCustomerId]);

  // Restore data from localStorage on component mount
  useEffect(() => {
    restoreFormData();
  }, []);

  // Autosave functionality
  const saveToLocalStorage = () => {
    try {
      const currentTab = typeof window !== 'undefined' ? localStorage.getItem('technicianActiveTab') : 'create';

      const formData = {
        selectedCustomerId,
        reportType,
        parentReportId,
        parentReportNumber,
        inspectionData,
        visitDate,
        notes,
        serviceItems,
        engineerSignature,
        customerSignature,
        signaturePersonName,
        signaturePersonContact,
        invoiceData,
        serviceStartTime,
        serviceEndTime,
        isServiceActive,
        elapsedTime,
        locationData,
        customerSeal,
        currentTab: currentTab || 'create',
        timestamp: Date.now()
      };

      localStorage.setItem('serviceReportDraft', JSON.stringify(formData));
      setAutosaveStatus('saved');

      // Clear saved status after 3 seconds
      setTimeout(() => setAutosaveStatus(null), 3000);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      setAutosaveStatus('error');
      setTimeout(() => setAutosaveStatus(null), 3000);
    }
  };

  const restoreFormData = () => {
    try {
      const savedData = localStorage.getItem('serviceReportDraft');
      if (savedData) {
        const formData = JSON.parse(savedData);

        // Only restore if data is less than 1 hour old
        if (Date.now() - formData.timestamp < 60 * 60 * 1000) {
          setSelectedCustomerId(formData.selectedCustomerId);
          setReportType(formData.reportType);
          setParentReportId(formData.parentReportId);
          setParentReportNumber(formData.parentReportNumber);
          setInspectionData(formData.inspectionData);
          setVisitDate(formData.visitDate);
          setNotes(formData.notes);
          setServiceItems(formData.serviceItems || []);
          setEngineerSignature(formData.engineerSignature);
          setCustomerSignature(formData.customerSignature);
          setSignaturePersonName(formData.signaturePersonName);
          setSignaturePersonContact(formData.signaturePersonContact);
          setInvoiceData(formData.invoiceData);
          setServiceStartTime(formData.serviceStartTime ? new Date(formData.serviceStartTime) : null);
          setServiceEndTime(formData.serviceEndTime ? new Date(formData.serviceEndTime) : null);
          setIsServiceActive(formData.isServiceActive);
          setElapsedTime(formData.elapsedTime || 0);
          setLocationData(formData.locationData || { start: null, end: null });
          setCustomerSeal(formData.customerSeal);

          if (formData.serviceStartTime && formData.isServiceActive) {
            startTimer(new Date(formData.serviceStartTime));
          }

          // Navigate to the correct tab based on saved data
          if (formData.currentTab) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('technicianActiveTab', formData.currentTab);
              window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: formData.currentTab } }));
            }
          } else {
            navigateToCreateTab();
          }

          setMessage({
            type: 'success',
            text: 'Previous session data restored successfully!'
          });

          // Clear restored data after 5 seconds
          setTimeout(() => setMessage(null), 5000);
        } else {
          // Clear old data
          localStorage.removeItem('serviceReportDraft');
        }
      }
    } catch (error) {
      console.error('Failed to restore from localStorage:', error);
      localStorage.removeItem('serviceReportDraft');
    }
  };

  const debouncedAutosave = () => {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
    }

    setAutosaveStatus('saving');

    const timer = setTimeout(() => {
      saveToLocalStorage();
    }, AUTOSAVE_DELAY);

    setAutosaveTimer(timer);
  };

  // Cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimer) {
        clearTimeout(autosaveTimer);
      }
    };
  }, [autosaveTimer]);

  // Trigger autosave when form data changes
  useEffect(() => {
    if (selectedCustomerId || serviceItems.length > 0 || notes || engineerSignature || customerSignature) {
      debouncedAutosave();
    }
  }, [
    selectedCustomerId,
    reportType,
    parentReportId,
    parentReportNumber,
    visitDate,
    notes,
    serviceItems,
    engineerSignature,
    customerSignature,
    signaturePersonName,
    signaturePersonContact,
    invoiceData
  ]);

  const startTimer = (startTime: Date) => {
    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);
    setTimerInterval(interval);
  };

  const getCurrentLocation = (): Promise<{ lat: number; lng: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(new Error(`GPS Error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      // Using a free geocoding service (you can replace with your preferred service)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const handleStartService = () => {
    if (!gpsEnabled) {
      setMessage({ type: 'error', text: 'GPS is required for service tracking. Please enable location services.' });
      return;
    }

    // Get current location before starting service
    getCurrentLocation()
      .then(async (location) => {
        const address = await reverseGeocode(location.lat, location.lng);
        
        const startTime = new Date();
        setServiceStartTime(startTime);
        setIsServiceActive(true);
        
        // Store start location
        setLocationData(prev => ({
          ...prev,
          start: { ...location, address }
        }));
        
        // Save session to localStorage with location
        localStorage.setItem('activeServiceSession', JSON.stringify({
          startTime: startTime.toISOString(),
          reportType,
          customerId: selectedCustomerId,
          startLocation: { ...location, address },
          browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }));
        
        startTimer(startTime);
        setMessage({ 
          type: 'success', 
          text: `Service timer started! Location captured: ${address.substring(0, 50)}...` 
        });
      })
      .catch((error) => {
        setLocationError(error.message);
        setMessage({ 
          type: 'error', 
          text: 'Failed to get location. GPS is required for service tracking.' 
        });
      });
  };

  const handleStopService = () => {
    if (!gpsEnabled) {
      const endTime = new Date();
      setServiceEndTime(endTime);
      setIsServiceActive(false);
      
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      
      localStorage.removeItem('activeServiceSession');
      setMessage({ type: 'success', text: 'Service timer stopped.' });
      return;
    }

    // Get end location
    getCurrentLocation()
      .then(async (location) => {
        const address = await reverseGeocode(location.lat, location.lng);
        
        const endTime = new Date();
        setServiceEndTime(endTime);
        setIsServiceActive(false);
        
        // Store end location
        setLocationData(prev => ({
          ...prev,
          end: { ...location, address }
        }));
        
        if (timerInterval) {
          clearInterval(timerInterval);
          setTimerInterval(null);
        }
        
        // Clear saved session
        localStorage.removeItem('activeServiceSession');
        
        const duration = calculateServiceDuration();
        setMessage({ 
          type: 'success', 
          text: `Service completed! Duration: ${formatTime(duration)}. End location: ${address.substring(0, 50)}...` 
        });
      })
      .catch(() => {
        // Allow stopping even if GPS fails
        const endTime = new Date();
        setServiceEndTime(endTime);
        setIsServiceActive(false);
        
        if (timerInterval) {
          clearInterval(timerInterval);
          setTimerInterval(null);
        }
        
        localStorage.removeItem('activeServiceSession');
        setMessage({ 
          type: 'error', 
          text: 'Service stopped but failed to capture end location.' 
        });
      });
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const calculateServiceDuration = (): number => {
    if (serviceStartTime) {
      const endTime = serviceEndTime || new Date();
      return Math.floor((endTime.getTime() - serviceStartTime.getTime()) / 1000);
    }
    return 0;
  };
  
  const loadInspectionReport = async (reportNumber: string) => {
    if (!reportNumber.trim()) return;
    
    setIsLoadingInspection(true);
    try {
      // First, find the selected report from the already fetched inspection reports
      const selectedReport = inspectionReports.find(report => report.report_number === reportNumber);
      
      if (selectedReport) {
        // If we have the report in the list, use its ID to get full details
        const response = await api.getServiceReport(selectedReport.id) as any;
        
        if (response && response.success && response.data) {
          const reportData = response.data;
          setInspectionData(reportData);
          setParentReportId(reportData.id);
          
          // Pre-populate service items from inspection (user can select which ones to complete)
          const inspectionItems = (reportData.items || []).map((item: any) => ({
            item_id: item.item_id,
            manual_item_data: item.manual_item_data || undefined,
            complaint: item.complaint || '',
            diagnostics: item.diagnostics || '',
            action_taken: '', // Leave empty for completion visit
            warranty_flag: item.warranty_flag || false,
            installation: item.installation || false,
            amc_visit: item.amc_visit || false,
            notes: item.notes || '',
            before_images: item.before_images || [],
            after_images: [], // New images for completion
            spares: [], // New spares for completion
            selected_for_completion: true // Auto-select items for completion by default
          }));
          
          setServiceItems(inspectionItems);
          setMessage({ 
            type: 'success', 
            text: `Loaded inspection report ${reportNumber} with ${inspectionItems.length} items` 
          });
        } else {
          setMessage({ 
            type: 'error', 
            text: (response as any)?.error || 'Failed to load inspection report details' 
          });
        }
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Selected report not found. Please try again.' 
        });
      }
    } catch (error) {
      console.error('Failed to load inspection report:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to load inspection report' 
      });
    } finally {
      setIsLoadingInspection(false);
    }
  };

  const loadInitialData = async () => {
    try {
      const [customersRes, sparesRes] = await Promise.all([
        api.getCustomers(),
        api.getSpares()
      ]) as [any, any];

      if (customersRes.success) setCustomers(customersRes.data || []);
      if (sparesRes.success) setSpares(sparesRes.data || []);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const loadAssignedSpares = async () => {
    if (!user?.id) {
      setAssignedSpares([]);
      return;
    }
    try {
      const assignmentsRes = await api.getTechnicianAssignments(user.id) as { success: boolean; data?: TechnicianSpareAssignment[] };
      if (assignmentsRes.success && assignmentsRes.data) {
        const technicianAssignments = assignmentsRes.data.filter(a => a.technician_id === user.id);
        const uniqueSpareMap = new Map<number, Spare>();
        technicianAssignments.forEach(assignment => {
          const spare = assignment.spare_inventory?.spare;
          if (spare && !uniqueSpareMap.has(spare.id)) {
            uniqueSpareMap.set(spare.id, spare);
          }
        });
        setAssignedSpares(Array.from(uniqueSpareMap.values()));
      } else {
        setAssignedSpares([]);
      }
    } catch (error) {
      console.error('Failed to load assigned spares:', error);
      setAssignedSpares([]);
    }
  };

  const loadCustomerItems = async (customerId: number) => {
    try {
      const response = await api.getItems(customerId) as any;
      if (response.success) {
        setItems(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const loadEmailRecipients = async (_reportId: number) => {
    try {
      const response = await api.getEmailRecipients() as any;
      if (response.success) {
        setEmailRecipients(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load email recipients:', error);
      // Set empty array as fallback
      setEmailRecipients([]);
    }
  };

  const addServiceItem = () => {
    const newItems = [...serviceItems, {
      complaint: '',
      diagnostics: '',
      action_taken: '',
      warranty_flag: false,
      installation: false,
      amc_visit: false,
      notes: '',
      before_images: [],
      after_images: [],
      spares: []
    }];
    setServiceItems(newItems);
    setExpandedIndex(newItems.length - 1);
  };

  const removeServiceItem = (index: number) => {
    const newItems = serviceItems.filter((_, i) => i !== index);
    setServiceItems(newItems);
    setExpandedIndex(prev => {
      if (prev === null) return null;
      if (prev === index) return newItems.length ? Math.min(index, newItems.length - 1) : null;
      return prev > index ? prev - 1 : prev;
    });
  };

  // Handle service type checkbox toggle (allows unchecking)
  const handleServiceTypeChange = (itemIndex: number, type: 'warranty' | 'installation' | 'amc') => {
    const updated = [...serviceItems];
    const item = updated[itemIndex];

    // Toggle the selected type instead of mutually exclusive selection
    switch (type) {
      case 'warranty':
        item.warranty_flag = !item.warranty_flag;
        break;
      case 'installation':
        item.installation = !item.installation;
        break;
      case 'amc':
        item.amc_visit = !item.amc_visit;
        break;
    }

    setServiceItems(updated);
  };

  // Original updateServiceItem function for non-text fields (checkboxes, etc.)
  const updateServiceItem = (index: number, field: keyof ServiceItemForm, value: any) => {
    const updated = [...serviceItems];
    updated[index] = { ...updated[index], [field]: value };
    setServiceItems(updated);
  };
  void updateServiceItem;

  // Learn from user input and save phrases for future suggestions
  const learnFromInput = (field: keyof ServiceItemForm, value: string) => {
    if (value && value.length > 10) { // Only learn from substantial input
      // Extract meaningful phrases (sentences or key terms)
      const phrases = value.split(/[.\n]/).filter(p => p.trim().length > 5);

      phrases.forEach(phrase => {
        const trimmed = phrase.trim();
        if (trimmed.length > 10 && trimmed.length < 200) {
          switch (field) {
            case 'complaint':
              phraseManager.addPhrase('complaints', trimmed);
              break;
            case 'diagnostics':
              phraseManager.addPhrase('diagnostics', trimmed);
              break;
            case 'action_taken':
              phraseManager.addPhrase('actions', trimmed);
              break;
          }
        }
      });
    }
  };

  // Enhanced updateServiceItem function that triggers autosave
  const updateServiceItemWithAutosave = (index: number, field: keyof ServiceItemForm, value: any) => {
    const updated = [...serviceItems];
    updated[index] = { ...updated[index], [field]: value };
    setServiceItems(updated);

    // Learn from substantial text input
    if (typeof value === 'string' && value.length > 10) {
      learnFromInput(field, value);
    }

    // Trigger autosave
    debouncedAutosave();
  };

  // Enhanced handlers that trigger autosave and tab navigation
  const handleCustomerSelectWithAutosave = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setShowCustomerSelector(false);
    debouncedAutosave();

    // Navigate to create tab if currently on dashboard
    navigateToCreateTab();
  };

  const navigateToCreateTab = () => {
    // Navigate to the create tab by updating the TechnicianLayout state
    if (typeof window !== 'undefined') {
      localStorage.setItem('technicianActiveTab', 'create');
      // Dispatch a custom event to notify the parent layout
      window.dispatchEvent(new CustomEvent('navigateToCreateTab'));
    }
  };

  const handleReportTypeChange = (newReportType: 'inspection' | 'completion' | 'one_time') => {
    setReportType(newReportType);
    debouncedAutosave();
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    debouncedAutosave();
  };

  const handleInvoiceDataChange = (field: string, value: any) => {
    setInvoiceData(prev => ({ ...prev, [field]: value }));
    debouncedAutosave();
  };

  const handleSignaturePersonChange = (field: string, value: string) => {
    if (field === 'name') {
      setSignaturePersonName(value);
    } else {
      setSignaturePersonContact(value);
    }
    debouncedAutosave();
  };

  const toggleItemForCompletion = (index: number) => {
    const updated = [...serviceItems];
    updated[index].selected_for_completion = !updated[index].selected_for_completion;
    setServiceItems(updated);
  };

  const addSpareToItem = (itemIndex: number) => {
    const updated = [...serviceItems];
    updated[itemIndex].spares.push({ 
      spare_id: 0, 
      quantity: 1, 
      price: 0, 
      unique_spare_ids: [],
      status: 'consumed'
    });
    setServiceItems(updated);
  };

  const removeSpareFromItem = (itemIndex: number, spareIndex: number) => {
    const updated = [...serviceItems];
    updated[itemIndex].spares.splice(spareIndex, 1);
    setServiceItems(updated);
  };

  const updateSpare = (itemIndex: number, spareIndex: number, field: string, value: any) => {
    const updated = [...serviceItems];
    updated[itemIndex].spares[spareIndex] = { ...updated[itemIndex].spares[spareIndex], [field]: value };
    
    if (field === 'spare_id') {
      const spare = assignedSpares.find(s => s.id === parseInt(value)) || spares.find(s => s.id === parseInt(value));
      if (spare) {
        updated[itemIndex].spares[spareIndex].price = spare.price;
        // Load available unique spare IDs for this spare type
        loadAvailableSpareIds(parseInt(value), itemIndex, spareIndex);
      }
    }
    
    setServiceItems(updated);
  };

  const loadAvailableSpareIds = async (spareId: number, itemIndex: number, spareIndex: number) => {
    try {
      const response = await api.getAvailableSparesByType(spareId) as any;
      if (response.success) {
        const updated = [...serviceItems];
        updated[itemIndex].spares[spareIndex].available_unique_ids = response.data || [];
        setServiceItems(updated);
      }
    } catch (error) {
      console.error('Failed to load available spare IDs:', error);
    }
  };

  const updateUniqueSpareIds = (itemIndex: number, spareIndex: number, uniqueIds: string[]) => {
    const updated = [...serviceItems];
    updated[itemIndex].spares[spareIndex].unique_spare_ids = uniqueIds;
    updated[itemIndex].spares[spareIndex].quantity = uniqueIds.length;
    setServiceItems(updated);
  };

  const handleSignatureSave = (signature: string, type: 'engineer' | 'customer') => {
    if (type === 'engineer') {
      setEngineerSignature(signature);
    } else {
      setCustomerSignature(signature);
    }
    setShowSignatureModal({ type: 'engineer', show: false });
  };

  const handleImageUpload = async (file: File, itemIndex: number, imageType: 'before' | 'after') => {
    try {
      const response = await api.uploadImage(file) as any;
      if (response.success && response.filename) {
        const updated = [...serviceItems];
        if (imageType === 'before') {
          updated[itemIndex].before_images.push(response.filename);
        } else {
          updated[itemIndex].after_images.push(response.filename);
        }
        setServiceItems(updated);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  };

  const removeImage = (itemIndex: number, imageIndex: number, imageType: 'before' | 'after') => {
    const updated = [...serviceItems];
    if (imageType === 'before') {
      updated[itemIndex].before_images.splice(imageIndex, 1);
    } else {
      updated[itemIndex].after_images.splice(imageIndex, 1);
    }
    setServiceItems(updated);
  };

  const handleCustomerCreated = (customer: Customer) => {
    setCustomers(prev => [...prev, customer]);
  };

  const handleSealCapture = (sealImage: string) => {
    setCustomerSeal(sealImage);
  };

  const handleSealSave = async (sealImage: string) => {
    if (!selectedCustomerId) {
      setMessage({ type: 'error', text: 'Please select a customer first' });
      return;
    }

    try {
      const response = await api.saveCustomerSeal(selectedCustomerId, sealImage) as any;
      if (response && response.success) {
        setMessage({ type: 'success', text: 'Customer seal saved successfully' });
      } else {
        setMessage({ type: 'error', text: response?.error || 'Failed to save customer seal' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save customer seal' });
    }
  };

  const handleItemSelect = (item: Item | null, manualData?: any) => {
    const itemIndex = showItemSelector.itemIndex;
    const updated = [...serviceItems];
    
    if (item) {
      updated[itemIndex].item_id = item.id;
      updated[itemIndex].manual_item_data = undefined;
    } else if (manualData) {
      updated[itemIndex].item_id = undefined;
      updated[itemIndex].manual_item_data = manualData;
    }
    
    setServiceItems(updated);
    setShowItemSelector({show: false, itemIndex: -1});
  };

  const validateForm = () => {
    if (!selectedCustomerId) {
      setMessage({ type: 'error', text: 'Please select a customer' });
      return false;
    }

    if (reportType === 'completion' && !parentReportId) {
      setMessage({ type: 'error', text: 'Please load an inspection report first' });
      return false;
    }

    if (serviceItems.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one service item' });
      return false;
    }

    // For completion reports, check if at least one item is selected
    if (reportType === 'completion') {
      const selectedItems = serviceItems.filter(item => item.selected_for_completion);
      if (selectedItems.length === 0) {
        setMessage({ type: 'error', text: 'Please select at least one item for completion' });
        return false;
      }
    }

    for (const item of serviceItems) {
      // Skip validation for unselected completion items
      if (reportType === 'completion' && !item.selected_for_completion) {
        continue;
      }
      
      if (!item.item_id && !item.manual_item_data) {
        setMessage({ type: 'error', text: 'Please select or add item details for each service item' });
        return false;
      }
      if (!item.complaint || !item.action_taken) {
        setMessage({ type: 'error', text: 'Please fill complaint and action taken for each service item' });
        return false;
      }
    }

    // Require signatures for all report types
    if (!engineerSignature || !customerSignature) {
      setMessage({ type: 'error', text: 'Both engineer and customer signatures are required for all service reports' });
      return false;
    }

    // Validate signature person details
    if (!signaturePersonName.trim()) {
      setMessage({ type: 'error', text: 'Signature person name is required' });
      return false;
    }

    // Validate invoice data for one_time and completion reports (unless AMC visit)
    if ((reportType === 'one_time' || reportType === 'completion') && !hasAmcVisit && !invoiceData.unbilled && !invoiceData.required_approval) {
      // Check if any service item is under warranty or installation
      const hasWarrantyOrInstallation = serviceItems.some(item => item.warranty_flag || item.installation);

      // Skip invoice validation if any item is under warranty or installation
      if (!hasWarrantyOrInstallation) {
        if (invoiceData.payment_status === 'paid') {
          if (!invoiceData.invoice_number || !invoiceData.receipt_number || !invoiceData.amount) {
            setMessage({ type: 'error', text: 'Invoice number, receipt number, and amount are required for paid invoices' });
            return false;
          }
        } else if (invoiceData.payment_status === 'unpaid') {
          if (!invoiceData.invoice_number || !invoiceData.amount) {
            setMessage({ type: 'error', text: 'Invoice number and amount are required for unpaid invoices' });
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!selectedCustomerId) {
      setMessage({ type: 'error', text: 'Please select a customer to save a draft' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const itemsToSend = serviceItems;
      const serviceDuration = calculateServiceDuration();

      const reportData = {
        customer_id: selectedCustomerId,
        type: reportType,
        parent_report_id: parentReportId,
        visit_date: visitDate,
        status: 'draft',
        engineer_signature: engineerSignature || undefined,
        customer_signature: customerSignature || undefined,
        signature_person_name: signaturePersonName || undefined,
        signature_person_contact: signaturePersonContact || undefined,
        notes,
        service_start_time: serviceStartTime?.toISOString(),
        service_end_time: serviceEndTime ? serviceEndTime.toISOString() : undefined,
        service_duration: serviceDuration,
        location_data: locationData,
        browser_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        gps_enabled: gpsEnabled,
        items: itemsToSend,
        invoice_data: null,
        analytics_data: analyticsData
      };

      let response: any;
      if (savedReportData?.id) {
        response = await api.updateServiceReport(savedReportData.id, reportData) as any;
      } else {
        response = await api.createServiceReport(reportData) as any;
      }

      if (response && response.success) {
        const newId = response.data?.id ?? savedReportData?.id;
        const newNumber = response.data?.report_number ?? savedReportData?.reportNumber ?? '';
        if (newId) {
          setSavedReportData({ id: newId, reportNumber: newNumber });
        }
        setMessage({ type: 'success', text: 'Draft saved successfully' });
      } else {
        setMessage({ type: 'error', text: response?.error || 'Failed to save draft' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save draft' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    // Stop timer if active
    if (isServiceActive) {
      handleStopService();
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Filter items for completion reports (only send selected items)
      const itemsToSend = reportType === 'completion' 
        ? serviceItems.filter(item => item.selected_for_completion)
        : serviceItems;
      
      const serviceDuration = calculateServiceDuration();
      
      const reportData = {
        customer_id: selectedCustomerId,
        type: reportType,
        parent_report_id: parentReportId,
        visit_date: visitDate,
        status: reportType === 'inspection' ? 'inspection' : 'completed',
        engineer_signature: engineerSignature,
        customer_signature: customerSignature,
        signature_person_name: signaturePersonName,
        signature_person_contact: signaturePersonContact,
        notes,
        service_start_time: serviceStartTime?.toISOString(),
        service_end_time: (serviceEndTime || new Date()).toISOString(),
        service_duration: serviceDuration,
        location_data: locationData,
        browser_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        gps_enabled: gpsEnabled,
        items: itemsToSend,
        invoice_data: (reportType === 'one_time' || reportType === 'completion') && !hasAmcVisit ? invoiceData : null,
        analytics_data: analyticsData // Include analytics for tracking
      };

      let response: any;
      if (savedReportData?.id) {
        response = await api.updateServiceReport(savedReportData.id, reportData) as any;
      } else {
        response = await api.createServiceReport(reportData) as any;
      }

      if (response && response.success) {
        const successMessage = reportType === 'completion' 
          ? `Completion report created successfully! Inspection report ${parentReportNumber} has been updated. Service time: ${formatTime(serviceDuration)}`
          : `Service report created successfully! Service time: ${formatTime(serviceDuration)}`;
        setMessage({ type: 'success', text: successMessage });

        // Store report data for email modal
        const newId = response.data?.id ?? savedReportData?.id;
        const newNumber = response.data?.report_number ?? savedReportData?.reportNumber ?? '';
        if (newId) {
          setSavedReportData({ id: newId, reportNumber: newNumber });
        }

        // Load email recipients and show email modal
        if (newId) {
          loadEmailRecipients(newId);
        }
        setShowEmailModal(true);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to create service report' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create service report' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    // Stop timer and clear session
    if (isServiceActive) {
      handleStopService();
    }

    // Clear localStorage draft
    localStorage.removeItem('serviceReportDraft');
    setAutosaveStatus(null);

    // Navigate back to dashboard
    if (typeof window !== 'undefined') {
      localStorage.setItem('technicianActiveTab', 'dashboard');
      window.dispatchEvent(new CustomEvent('navigateToDashboard'));
    }

    setSelectedCustomerId(null);
    setReportType('one_time');
    setParentReportId(null);
    setParentReportNumber('');
    setInspectionData(null);
    setVisitDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setServiceItems([]);
    setExpandedIndex(null);
    setEngineerSignature('');
    setCustomerSignature('');
    setSignaturePersonName('');
    setSignaturePersonContact('');
    setInvoiceData({
      invoice_number: '',
      receipt_number: '',
      amount: '',
      payment_status: 'unpaid',
      unbilled: false,
      required_approval: false
    });
    setServiceStartTime(null);
    setServiceEndTime(null);
    setElapsedTime(0);
    setIsServiceActive(false);
    
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  };

  // Check if any service item has AMC visit selected (disables invoice)
  const hasAmcVisit = serviceItems.some(item => item.amc_visit);

  // Calculate analytics data for tracking
  const analyticsData = {
    totalItems: serviceItems.length,
    amcVisits: serviceItems.filter(item => item.amc_visit).length,
    warrantyVisits: serviceItems.filter(item => item.warranty_flag).length,
    installationVisits: serviceItems.filter(item => item.installation).length,
    regularVisits: serviceItems.filter(item => !item.amc_visit && !item.warranty_flag && !item.installation).length
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">

        {/* Autosave Status Indicator */}
        <div className="flex items-center space-x-4">
          {autosaveStatus && (
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm ${
              autosaveStatus === 'saving' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
              autosaveStatus === 'saved' ? 'bg-green-100 text-green-800 border border-green-300' :
              'bg-red-100 text-red-800 border border-red-300'
            }`}>
              {autosaveStatus === 'saving' && (
                <>
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              )}
              {autosaveStatus === 'saved' && (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Auto-saved</span>
                </>
              )}
              {autosaveStatus === 'error' && (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Save failed</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Service Timer Controls */}
        <div className="flex items-center space-x-4">
          {locationError && (
            <div className="px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-lg">
              <span className="text-yellow-800 text-sm">⚠️ GPS Required</span>
            </div>
          )}
          
          {isServiceActive ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 border border-green-300 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-800 font-mono text-lg">{formatTime(elapsedTime)}</span>
              </div>
              {locationData.start && (
                <div className="px-3 py-1 bg-blue-100 border border-blue-300 rounded-lg">
                  <span className="text-blue-800 text-xs">📍 Location Tracked</span>
                </div>
              )}
              <button
                onClick={handleStopService}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Stop Service
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartService}
              disabled={!selectedCustomerId}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={!gpsEnabled ? "GPS location is required for service tracking" : "Start service with GPS tracking"}
            >
              <div className="w-4 h-4 bg-white rounded-full"></div>
              <span>{gpsEnabled ? '📍 Start Service' : '⚠️ Start Service'}</span>
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
            <div className="flex space-x-2">
              <div className="flex-1">
                {selectedCustomer ? (
                  <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                    <div className="font-medium">{selectedCustomer.name}</div>
                    <div className="text-sm text-gray-500">{selectedCustomer.city}</div>
                  </div>
                ) : (
                  <div className="px-3 py-2 border border-gray-300 rounded-lg text-gray-500">
                    No customer selected
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowCustomerSelector(true)}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type *</label>
            <select
              value={reportType}
              onChange={(e) => handleReportTypeChange(e.target.value as 'inspection' | 'completion' | 'one_time')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="one_time">One-Time Service</option>
              <option value="inspection">Initial Inspection</option>
              <option value="completion">Completion Visit</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Visit Date *</label>
            <input
              type="date"
              value={visitDate}
              onChange={(e) => {
                setVisitDate(e.target.value);
                debouncedAutosave();
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {reportType === 'completion' && (
          <div className="mb-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Inspection Report *</label>
                {isLoadingInspectionReports ? (
                  <div className="flex items-center space-x-2 text-gray-600 p-3 bg-gray-50 rounded-lg">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading inspection reports...</span>
                  </div>
                ) : inspectionReports.length > 0 ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <select
                        value={parentReportNumber}
                        onChange={(e) => {
                          setParentReportNumber(e.target.value);
                          // Auto-load the selected report
                          if (e.target.value) {
                            loadInspectionReport(e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none pr-8"
                        disabled={isLoadingInspection}
                      >
                        <option value="">Select an inspection report</option>
                        {inspectionReports.map((report) => (
                          <option 
                            key={report.id} 
                            value={report.report_number}
                            className="text-sm"
                          >
                            {report.report_number} - {new Date(report.visit_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        {inspectionReports.length} inspection report{inspectionReports.length !== 1 ? 's' : ''} found
                      </p>
                      {isLoadingInspection && (
                        <div className="flex items-center text-xs text-blue-600">
                          <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                          Loading...
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedCustomerId ? (
                  <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <p className="font-medium">No inspection reports available</p>
                    <p className="text-amber-600 text-sm mt-1">
                      This customer doesn't have any inspection reports with status 'Inspection'. 
                      Please select a different customer or create a new inspection first.
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    Please select a customer to view available inspection reports
                  </div>
                )}
                
                {/* Manual entry fallback */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Or enter report number manually</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Enter inspection report number (e.g., SR20256951)"
                      value={parentReportNumber}
                      onChange={(e) => setParentReportNumber(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => parentReportNumber && loadInspectionReport(parentReportNumber)}
                      disabled={isLoadingInspection || !parentReportNumber.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isLoadingInspection ? 'Loading...' : 'Load'}
                    </button>
                  </div>
                </div>
              </div>
              
              {inspectionData && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <h4 className="font-medium text-green-800">Inspection Report Loaded</h4>
                  <p className="text-sm text-green-600">Customer: {inspectionData.customer.name}</p>
                  <p className="text-sm text-green-600">Items: {inspectionData.items.length}</p>
                  <p className="text-sm text-green-600">Date: {new Date(inspectionData.visit_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Service Items</h3>
          <button
            onClick={addServiceItem}
            disabled={!selectedCustomerId}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>

        {!selectedCustomerId && (
          <div className="text-center py-8 text-gray-500">
            <p>Please select a customer first to add service items.</p>
          </div>
        )}

        {selectedCustomerId && serviceItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No service items added yet. Click "Add Item" to get started.</p>
          </div>
        )}

        {serviceItems.length > 0 && (
          <div className="space-y-6">
            {serviceItems.map((item, itemIndex) => (
              <div key={itemIndex} className="bg-gray-50 rounded-lg p-4 relative">
                {expandedIndex !== null && expandedIndex !== itemIndex ? (
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-sm text-gray-700 truncate">
                      <span className="font-medium">Item {itemIndex + 1}:</span>{' '}
                      {item.item_id
                        ? `${items.find(i => i.id === item.item_id)?.model || 'Item'}${items.find(i => i.id === item.item_id)?.serial_number ? ' - ' + (items.find(i => i.id === item.item_id)?.serial_number) : ''}`
                        : item.manual_item_data
                          ? `${item.manual_item_data.brand} ${item.manual_item_data.model} - ${item.manual_item_data.serial_number}`
                          : 'No item selected'}
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
                    {reportType === 'completion' && (
                      <div className="mb-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={item.selected_for_completion || false}
                            onChange={() => toggleItemForCompletion(itemIndex)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Complete this item (uncheck if no repair needed)
                          </span>
                        </label>
                      </div>
                    )}

                    <button
                      onClick={() => removeServiceItem(itemIndex)}
                      className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Item *</label>
                      <div className="flex space-x-2">
                        <div className="flex-1">
                          {item.item_id || item.manual_item_data ? (
                            <div className="px-3 py-2 border border-gray-300 rounded-lg bg-white">
                              {item.item_id ? (
                                <div>
                                  {items.find(i => i.id === item.item_id)?.model} - {items.find(i => i.id === item.item_id)?.serial_number}
                                </div>
                              ) : (
                                <div>
                                  {item.manual_item_data?.brand} {item.manual_item_data?.model} - {item.manual_item_data?.serial_number}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="px-3 py-2 border border-gray-300 rounded-lg text-gray-500">
                              No item selected
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setShowItemSelector({show: true, itemIndex})}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <SmartTextInput
                          label="Complaint"
                          value={item.complaint}
                          onChange={(value) => updateServiceItemWithAutosave(itemIndex, 'complaint', value)}
                          category="complaint"
                          suggestions={[...COMMON_PHRASES.complaints, ...phraseManager.getSuggestionsForCategory('complaints')]}
                          templates={SERVICE_TEMPLATES.filter(t => t.category === 'complaint')}
                          placeholder="Describe the issue or problem"
                          required
                          disabled={reportType === 'completion'}
                        />
                        {reportType === 'completion' && (
                          <p className="text-xs text-gray-500 mt-1">From inspection report</p>
                        )}
                      </div>

                      <div>
                        <SmartTextInput
                          label="Diagnostics"
                          value={item.diagnostics}
                          onChange={(value) => updateServiceItemWithAutosave(itemIndex, 'diagnostics', value)}
                          category="diagnostics"
                          suggestions={[...COMMON_PHRASES.diagnostics, ...phraseManager.getSuggestionsForCategory('diagnostics')]}
                          templates={SERVICE_TEMPLATES.filter(t => t.category === 'diagnostics')}
                          placeholder="Diagnostic findings and observations"
                          disabled={reportType === 'completion'}
                        />
                        {reportType === 'completion' && (
                          <p className="text-xs text-gray-500 mt-1">From inspection report</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <SmartTextInput
                          label="Action Taken"
                          value={item.action_taken}
                          onChange={(value) => updateServiceItemWithAutosave(itemIndex, 'action_taken', value)}
                          category="action_taken"
                          suggestions={[...COMMON_PHRASES.actions, ...phraseManager.getSuggestionsForCategory('actions')]}
                          templates={SERVICE_TEMPLATES.filter(t => t.category === 'action_taken')}
                          placeholder={reportType === 'completion' ? "Describe the repair/completion work done" : "Describe the action taken"}
                          required
                          rows={4}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea
                          value={item.notes}
                          onChange={(e) => updateServiceItemWithAutosave(itemIndex, 'notes', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={4}
                          placeholder="Additional notes"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Service Type (Select one)</label>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <label className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            item.amc_visit ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                          }`}>
                            <input
                              type="checkbox"
                              checked={item.amc_visit}
                              onChange={() => handleServiceTypeChange(itemIndex, 'amc')}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <div>
                              <div className="font-medium text-gray-900">AMC Visit</div>
                              <div className="text-sm text-gray-500">Annual Maintenance Contract</div>
                            </div>
                          </label>

                          <label className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            item.warranty_flag ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                          }`}>
                            <input
                              type="checkbox"
                              checked={item.warranty_flag}
                              onChange={() => handleServiceTypeChange(itemIndex, 'warranty')}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div>
                              <div className="font-medium text-gray-900">Under Warranty</div>
                              <div className="text-sm text-gray-500">Covered by manufacturer warranty</div>
                            </div>
                          </label>

                          <label className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            item.installation ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                          }`}>
                            <input
                              type="checkbox"
                              checked={item.installation}
                              onChange={() => handleServiceTypeChange(itemIndex, 'installation')}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <div>
                              <div className="font-medium text-gray-900">Installation</div>
                              <div className="text-sm text-gray-500">New equipment installation</div>
                            </div>
                          </label>
                        </div>

                        {(item.amc_visit || item.warranty_flag || item.installation) && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-600">
                              <strong>Selected:</strong> {
                                item.amc_visit ? 'AMC Visit' :
                                item.warranty_flag ? 'Under Warranty' :
                                item.installation ? 'Installation' : 'None'
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Before Images</label>
                        <ImageUpload
                          onUpload={(file) => handleImageUpload(file, itemIndex, 'before')}
                          images={item.before_images}
                          onRemove={(imageIndex) => removeImage(itemIndex, imageIndex, 'before')}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">After Images</label>
                        <ImageUpload
                          onUpload={(file) => handleImageUpload(file, itemIndex, 'after')}
                          images={item.after_images}
                          onRemove={(imageIndex) => removeImage(itemIndex, imageIndex, 'after')}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">Spares Used</label>
                        <button
                          onClick={() => addSpareToItem(itemIndex)}
                          className="flex items-center space-x-1 px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Spare</span>
                        </button>
                      </div>

                      {item.spares.map((spare, spareIndex) => (
                        <div key={spareIndex} className="bg-white border border-gray-200 rounded-lg p-3 mb-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                          <select
                            value={spare.spare_id || ''}
                            onChange={(e) => updateSpare(itemIndex, spareIndex, 'spare_id', parseInt(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            disabled={assignedSpares.length === 0}
                          >
                            <option value="">{assignedSpares.length ? 'Select Spare' : 'No spares assigned'}</option>
                            {assignedSpares.map(sp => (
                              <option key={sp.id} value={sp.id}>{sp.name} - {sp.part_number}</option>
                            ))}
                          </select>
                          
                          <input
                            type="number"
                            placeholder="Quantity"
                            value={spare.quantity}
                            onChange={(e) => updateSpare(itemIndex, spareIndex, 'quantity', parseInt(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            min="1"
                            disabled
                          />
                          
                          <input
                            type="number"
                            placeholder="Price"
                            value={spare.price}
                            onChange={(e) => updateSpare(itemIndex, spareIndex, 'price', parseFloat(e.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            step="0.01"
                          />
                          </div>
                          
                          {spare.spare_id && spare.available_unique_ids && spare.available_unique_ids.length > 0 && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Unique Spare IDs ({spare.available_unique_ids.length} available)
                              </label>
                              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg">
                                {spare.available_unique_ids.map((uniqueSpare: any) => (
                                  <label
                                    key={uniqueSpare.id}
                                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={spare.unique_spare_ids?.includes(uniqueSpare.unique_spare_id) || false}
                                      onChange={(e) => {
                                        const currentIds = spare.unique_spare_ids || [];
                                        const newIds = e.target.checked
                                          ? [...currentIds, uniqueSpare.unique_spare_id]
                                          : currentIds.filter(id => id !== uniqueSpare.unique_spare_id);
                                        updateUniqueSpareIds(itemIndex, spareIndex, newIds);
                                      }}
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <div className="text-sm">
                                      <div className="font-medium text-gray-900">{uniqueSpare.unique_spare_id}</div>
                                      <div className="text-gray-500">AED {uniqueSpare.selling_price}</div>
                                    </div>
                                  </label>
                                ))}
                              </div>
                              
                              {spare.unique_spare_ids && spare.unique_spare_ids.length > 0 && (
                                <div className="mt-2 p-2 bg-blue-50 rounded">
                                  <div className="text-sm text-blue-800">
                                    Selected: {spare.unique_spare_ids.join(', ')}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                              Status: 
                              <select
                                value={spare.status || 'consumed'}
                                onChange={(e) => updateSpare(itemIndex, spareIndex, 'status', e.target.value)}
                                className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="consumed">Consumed</option>
                                <option value="returned">Returned</option>
                              </select>
                            </div>
                            
                          <button
                            onClick={() => removeSpareFromItem(itemIndex, spareIndex)}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Signatures required for all report types */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Signatures *</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Engineer Signature *</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              {engineerSignature ? (
                <div>
                  <img src={engineerSignature} alt="Engineer Signature" className="max-w-full h-20 mx-auto" />
                  <button
                    onClick={() => setShowSignatureModal({ type: 'engineer', show: true })}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Update Signature
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSignatureModal({ type: 'engineer', show: true })}
                  className="flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800"
                >
                  <Signature className="w-5 h-5" />
                  <span>Add Engineer Signature</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer Signature *</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              {customerSignature ? (
                <div>
                  <img src={customerSignature} alt="Customer Signature" className="max-w-full h-20 mx-auto" />
                  <button
                    onClick={() => setShowSignatureModal({ type: 'customer', show: true })}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Update Signature
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSignatureModal({ type: 'customer', show: true })}
                  className="flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800"
                >
                  <Signature className="w-5 h-5" />
                  <span>Add Customer Signature</span>
                </button>
              )}
            </div>
            
            {/* Customer Seal Section - moved near signature */}
            {selectedCustomerId && (
              <div className="mt-4">
                <CustomerSealUpload
                  customerId={selectedCustomerId}
                  initialSealImage={customerSeal}
                  onSealCapture={handleSealCapture}
                  onSealSave={handleSealSave}
                />
              </div>
            )}
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Signature Person Name *</label>
                <input
                  type="text"
                  value={signaturePersonName}
                  onChange={(e) => handleSignaturePersonChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter person's name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Signature Person Contact</label>
                <input
                  type="tel"
                  value={signaturePersonContact}
                  onChange={(e) => handleSignaturePersonChange('contact', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter contact number"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Analytics Summary */}
      {serviceItems.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{analyticsData.totalItems}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">{analyticsData.amcVisits}</div>
              <div className="text-sm text-purple-600">AMC Visits</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{analyticsData.warrantyVisits}</div>
              <div className="text-sm text-blue-600">Warranty</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{analyticsData.installationVisits}</div>
              <div className="text-sm text-green-600">Installation</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">{analyticsData.regularVisits}</div>
              <div className="text-sm text-orange-600">Regular</div>
            </div>
          </div>

          {hasAmcVisit && (
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-purple-700">📋</span>
                <span className="text-purple-800 text-sm">
                  <strong>AMC Visit Detected:</strong> Invoice details have been automatically disabled for this service report.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invoice Details Section - Only for One Time and Completion, disabled for AMC */}
      {(reportType === 'one_time' || reportType === 'completion') && !hasAmcVisit && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={invoiceData.unbilled}
                  onChange={(e) => handleInvoiceDataChange('unbilled', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Unbilled Service</span>
              </label>
            </div>
            
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={invoiceData.required_approval}
                  onChange={(e) => handleInvoiceDataChange('required_approval', e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-gray-700">Required Approval</span>
              </label>
            </div>
          </div>
          
          {!invoiceData.unbilled && !invoiceData.required_approval && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Number {invoiceData.payment_status === 'paid' ? '*' : '*'}
                  </label>
                  <input
                    type="text"
                    value={invoiceData.invoice_number}
                    onChange={(e) => handleInvoiceDataChange('invoice_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter invoice number"
                    required={!invoiceData.unbilled && !invoiceData.required_approval}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt Number {invoiceData.payment_status === 'paid' ? '*' : ''}
                  </label>
                  <input
                    type="text"
                    value={invoiceData.receipt_number}
                    onChange={(e) => handleInvoiceDataChange('receipt_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter receipt number"
                    required={invoiceData.payment_status === 'paid'}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount (AED) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={invoiceData.amount}
                    onChange={(e) => handleInvoiceDataChange('amount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter amount"
                    required={!invoiceData.unbilled && !invoiceData.required_approval}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status *</label>
                  <select
                    value={invoiceData.payment_status}
                    onChange={(e) => handleInvoiceDataChange('payment_status', e.target.value as 'paid' | 'unpaid')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
              
              {(invoiceData.unbilled || invoiceData.required_approval) && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    {invoiceData.unbilled && 'This service is marked as unbilled.'}
                    {invoiceData.required_approval && 'This service requires approval before processing.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">General Notes</label>
        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          placeholder="Any additional notes about the service visit..."
        />
      </div>

      <div className="flex items-center justify-end space-x-4">
        <button
          onClick={resetForm}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          disabled={isLoading}
        >
          Reset Form
        </button>
        <button
          onClick={handleSaveDraft}
          disabled={isLoading || !selectedCustomerId}
          className="flex items-center space-x-2 px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          title={!selectedCustomerId ? 'Select a customer to save a draft' : 'Save as draft without required fields'}
        >
          <Save className="w-4 h-4" />
          <span>{isLoading ? 'Saving...' : 'Save Draft'}</span>
        </button>
        
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isLoading ? 'Saving...' : 'Save Report'}</span>
        </button>
      </div>

      {showSignatureModal.show && (
        <SignatureModal
          title={`${showSignatureModal.type === 'engineer' ? 'Engineer' : 'Customer'} Signature`}
          onSave={(signature) => handleSignatureSave(signature, showSignatureModal.type)}
          onClose={() => setShowSignatureModal({ type: 'engineer', show: false })}
          onPreview={showSignatureModal.type === 'customer' ? () => setShowPreviewModal(true) : undefined}
        />
      )}

      {showCustomerSelector && (
        <CustomerSelector
          customers={customers}
          onSelect={handleCustomerSelectWithAutosave}
          onClose={() => setShowCustomerSelector(false)}
          onCustomerCreated={handleCustomerCreated}
        />
      )}

      {showItemSelector.show && (
        <ItemSelector
          customerId={selectedCustomerId!}
          onSelect={handleItemSelect}
          onClose={() => setShowItemSelector({show: false, itemIndex: -1})}
        />
      )}

      {/* Email Modal */}
      {showEmailModal && savedReportData && (
        <SendReportModal
          reportId={savedReportData.id}
          emailRecipients={emailRecipients}
          customerEmail={customers.find(c => c.id === selectedCustomerId)?.email || undefined}
          customerName={customers.find(c => c.id === selectedCustomerId)?.name || undefined}
          onSend={async (reportId, emails, message) => {
            try {
              // The SendReportModal now handles progress internally
              // This function is called after progress is complete
              const response = await api.sendReport(reportId, emails, message) as any;
              if (response.success) {
                setMessage({ type: 'success', text: 'Service report sent successfully!' });
                setEmailSentSuccess(true);
              } else {
                setMessage({ type: 'error', text: response.error || 'Failed to send service report' });
              }
            } catch (error) {
              setMessage({ type: 'error', text: 'Failed to send service report' });
            }
          }}
          onClose={() => {
            setShowEmailModal(false);
            setSavedReportData(null);
            setEmailRecipients([]);
            if (emailSentSuccess) {
              resetForm();
            }
            setEmailSentSuccess(false);
          }}
        />
      )}

      {/* Report Preview Modal for customer confirmation before signature */}
      <ReportPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        customer={customers.find(c => c.id === selectedCustomerId) || null}
        reportType={reportType}
        visitDate={visitDate}
        items={serviceItems}
        itemsCatalog={items}
        notes={notes}
        invoiceData={invoiceData}
        engineerSignature={engineerSignature}
        customerSignature={customerSignature}
        signaturePersonName={signaturePersonName}
        signaturePersonContact={signaturePersonContact}
      />

      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Service Report Saved Successfully!</h3>
              <p className="text-sm text-gray-500 mb-6">
                Your service report has been created and saved successfully.
              </p>
              <button
                onClick={() => setShowSuccessDialog(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateService;
