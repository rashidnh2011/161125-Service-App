import React, { useState, useEffect, useRef } from 'react';
import { Tag, BookOpen, Lightbulb } from 'lucide-react';

interface SmartTextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  disabled?: boolean;
  category: 'complaint' | 'diagnostics' | 'action_taken';
  suggestions?: string[];
  templates?: Array<{ id: string; name: string; content: string }>;
}

const SmartTextInput: React.FC<SmartTextInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 3,
  disabled = false,
  category,
  suggestions = [],
  templates = []
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter suggestions based on current input
  useEffect(() => {
    if (value.length > 2) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered.slice(0, 5)); // Show max 5 suggestions
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [value, suggestions]);

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleTemplateClick = (template: { id: string; name: string; content: string }) => {
    onChange(template.content);
    setShowTemplates(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleTagClick = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
      // Append tag to current value
      const newValue = value ? `${value} [${tag}]` : `[${tag}]`;
      onChange(newValue);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
    const newValue = value.replace(`[${tagToRemove}]`, '').trim();
    onChange(newValue);
  };

  // Common keywords for each category
  const getCommonKeywords = (cat: string) => {
    switch (cat) {
      case 'complaint':
        return [
          'Not working', 'No power', 'Display issue', 'Error message',
          'Strange noise', 'Overheating', 'Slow performance', 'Connection problem',
          'Physical damage', 'Software issue', 'Calibration needed'
        ];
      case 'diagnostics':
        return [
          'Power supply faulty', 'Circuit board damaged', 'Software corrupted',
          'Connection loose', 'Component failure', 'Overheating detected',
          'Calibration drift', 'Sensor malfunction', 'Display driver issue',
          'Memory error', 'Communication failure'
        ];
      case 'action_taken':
        return [
          'Replaced power supply', 'Repaired circuit board', 'Updated software',
          'Tightened connections', 'Replaced faulty component', 'Applied thermal paste',
          'Recalibrated device', 'Replaced sensor', 'Updated firmware',
          'Cleaned internal components', 'Reset to factory settings'
        ];
      default:
        return [];
    }
  };

  const commonKeywords = getCommonKeywords(category);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex space-x-2">
          {/* Templates Button */}
          {templates.length > 0 && (
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
              title="Show templates"
            >
              <BookOpen className="w-3 h-3" />
              <span>Templates</span>
            </button>
          )}

          {/* Keywords Button */}
          <button
            type="button"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            title="Show suggestions"
          >
            <Lightbulb className="w-3 h-3" />
            <span>Suggestions</span>
          </button>
        </div>
      </div>

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedTags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
        rows={rows}
        placeholder={placeholder}
        required={required}
      />

      {/* Templates Dropdown */}
      {showTemplates && templates.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {templates.map(template => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleTemplateClick(template)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-sm text-gray-900">{template.name}</div>
              <div className="text-xs text-gray-500 truncate">{template.content}</div>
            </button>
          ))}
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Keywords Section (when no dropdown is shown) */}
      {!showTemplates && !showSuggestions && (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-2 flex items-center">
            <Tag className="w-3 h-3 mr-1" />
            Common keywords:
          </div>
          <div className="flex flex-wrap gap-1">
            {commonKeywords.slice(0, 8).map(keyword => (
              <button
                key={keyword}
                type="button"
                onClick={() => handleTagClick(keyword)}
                disabled={selectedTags.includes(keyword)}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  selectedTags.includes(keyword)
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {keyword}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartTextInput;
