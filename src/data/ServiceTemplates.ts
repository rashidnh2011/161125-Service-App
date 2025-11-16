export interface ServiceTemplate {
    id: string;
    name: string;
    category: 'complaint' | 'diagnostics' | 'action_taken';
    content: string;
    tags?: string[];
  }
  
  // Predefined templates for common service scenarios
  export const SERVICE_TEMPLATES: ServiceTemplate[] = [
    // Complaint Templates
    {
      id: 'no_power',
      name: 'No Power',
      category: 'complaint',
      content: 'Device not powering on. No lights, no display, completely unresponsive.',
      tags: ['Power Issue', 'No Response', 'Electrical']
    },
    {
      id: 'display_problem',
      name: 'Display Issue',
      category: 'complaint',
      content: 'Display screen not working properly. Flickering, distorted, or completely blank.',
      tags: ['Display', 'Screen', 'Visual']
    },
    {
      id: 'error_codes',
      name: 'Error Codes',
      category: 'complaint',
      content: 'Error messages appearing on display. Specific error codes shown.',
      tags: ['Error Message', 'System Error', 'Code Display']
    },
    {
      id: 'inaccurate_readings',
      name: 'Inaccurate Readings',
      category: 'complaint',
      content: 'Scale giving incorrect weight measurements. Not accurate or consistent.',
      tags: ['Accuracy', 'Measurement', 'Calibration']
    },
    {
      id: 'connection_issues',
      name: 'Connection Problems',
      category: 'complaint',
      content: 'Unable to connect to computer or network. Communication failure.',
      tags: ['Connectivity', 'Communication', 'Network']
    },
  
    // Diagnostics Templates
    {
      id: 'power_supply_fault',
      name: 'Power Supply Fault',
      category: 'diagnostics',
      content: 'Power supply unit faulty. Input voltage incorrect or no output voltage detected.',
      tags: ['Power Supply', 'Voltage', 'Electrical Fault']
    },
    {
      id: 'circuit_board_damage',
      name: 'Circuit Board Damage',
      category: 'diagnostics',
      content: 'Main circuit board shows signs of damage. Burnt components or broken traces visible.',
      tags: ['PCB', 'Circuit', 'Hardware Damage']
    },
    {
      id: 'software_corruption',
      name: 'Software Corruption',
      category: 'diagnostics',
      content: 'Software corrupted or outdated. Firmware version incompatible with hardware.',
      tags: ['Software', 'Firmware', 'Corruption']
    },
    {
      id: 'sensor_malfunction',
      name: 'Sensor Malfunction',
      category: 'diagnostics',
      content: 'Load cell or sensor not functioning properly. Zero drift or inconsistent readings.',
      tags: ['Sensor', 'Load Cell', 'Calibration Drift']
    },
    {
      id: 'communication_failure',
      name: 'Communication Failure',
      category: 'diagnostics',
      content: 'Communication interface not working. RS232/USB/Ethernet connection issues.',
      tags: ['Communication', 'Interface', 'Connection']
    },
  
    // Action Taken Templates
    {
      id: 'replace_power_supply',
      name: 'Replace Power Supply',
      category: 'action_taken',
      content: 'Replaced faulty power supply unit with new compatible model. Tested input/output voltages.',
      tags: ['Replacement', 'Power Supply', 'Testing']
    },
    {
      id: 'repair_circuit_board',
      name: 'Repair Circuit Board',
      category: 'action_taken',
      content: 'Repaired damaged circuit board. Replaced burnt components and cleaned solder joints.',
      tags: ['Repair', 'PCB', 'Component Replacement']
    },
    {
      id: 'update_firmware',
      name: 'Update Firmware',
      category: 'action_taken',
      content: 'Updated firmware to latest version. Calibrated device and verified functionality.',
      tags: ['Update', 'Firmware', 'Calibration']
    },
    {
      id: 'calibrate_scale',
      name: 'Calibrate Scale',
      category: 'action_taken',
      content: 'Performed full calibration procedure. Zero and span calibration completed successfully.',
      tags: ['Calibration', 'Accuracy', 'Testing']
    },
    {
      id: 'clean_and_service',
      name: 'Clean and Service',
      category: 'action_taken',
      content: 'Cleaned internal components. Applied lubricant where needed. General maintenance performed.',
      tags: ['Cleaning', 'Maintenance', 'Service']
    },
    {
      id: 'replace_sensor',
      name: 'Replace Sensor',
      category: 'action_taken',
      content: 'Replaced faulty load cell/sensor. Reinstalled and calibrated for proper operation.',
      tags: ['Replacement', 'Sensor', 'Calibration']
    }
  ];
  
  // Helper function to get templates by category
  export const getTemplatesByCategory = (category: ServiceTemplate['category']): ServiceTemplate[] => {
    return SERVICE_TEMPLATES.filter(template => template.category === category);
  };
  
  // Helper function to get template by ID
  export const getTemplateById = (id: string): ServiceTemplate | undefined => {
    return SERVICE_TEMPLATES.find(template => template.id === id);
  };
  
  // Common phrases that can be used as suggestions
  export const COMMON_PHRASES = {
    complaints: [
      'Not working',
      'No power',
      'Display issue',
      'Error message',
      'Strange noise',
      'Overheating',
      'Slow performance',
      'Connection problem',
      'Physical damage',
      'Software issue',
      'Calibration needed',
      'Inaccurate readings',
      'Buttons not responding',
      'Screen flickering',
      'Battery not charging',
      'WiFi not connecting',
      'Printer not printing',
      'Touch screen unresponsive',
      'Fan making noise',
      'System freezing'
    ],
    diagnostics: [
      'Power supply faulty',
      'Circuit board damaged',
      'Software corrupted',
      'Connection loose',
      'Component failure',
      'Overheating detected',
      'Calibration drift',
      'Sensor malfunction',
      'Display driver issue',
      'Memory error',
      'Communication failure',
      'Voltage incorrect',
      'Fuse blown',
      'Cable damaged',
      'Settings corrupted',
      'Hardware incompatibility',
      'Driver missing',
      'Port not working',
      'Interface error',
      'Timing issue'
    ],
    actions: [
      'Replaced power supply',
      'Repaired circuit board',
      'Updated software',
      'Tightened connections',
      'Replaced faulty component',
      'Applied thermal paste',
      'Recalibrated device',
      'Replaced sensor',
      'Updated firmware',
      'Cleaned internal components',
      'Reset to factory settings',
      'Replaced battery',
      'Updated drivers',
      'Replaced cable',
      'Applied firmware patch',
      'Replaced motherboard',
      'Cleaned connectors',
      'Adjusted settings',
      'Replaced display',
      'Applied lubricant'
    ]
  };