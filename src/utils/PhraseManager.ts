import React, { useState, useEffect } from 'react';

interface PhraseStorage {
  complaints: string[];
  diagnostics: string[];
  actions: string[];
}

class PhraseManager {
  private static STORAGE_KEY = 'service_phrases';
  private static phrases: PhraseStorage = {
    complaints: [],
    diagnostics: [],
    actions: []
  };

  static loadPhrases(): PhraseStorage {
    if (typeof window === 'undefined') return this.phrases;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.phrases = { ...this.phrases, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load phrases from localStorage:', error);
    }

    return this.phrases;
  }

  static savePhrases(phrases: PhraseStorage) {
    this.phrases = phrases;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(phrases));
      } catch (error) {
        console.error('Failed to save phrases to localStorage:', error);
      }
    }
  }

  static addPhrase(category: keyof PhraseStorage, phrase: string) {
    if (!phrase || phrase.trim().length < 3) return;

    const trimmed = phrase.trim();
    const currentPhrases = this.phrases[category];

    // Avoid duplicates and limit to 50 phrases per category
    if (!currentPhrases.includes(trimmed) && currentPhrases.length < 50) {
      const updated = [...currentPhrases, trimmed];
      this.phrases = { ...this.phrases, [category]: updated };
      this.savePhrases(this.phrases);
    }
  }

  static getPhrases(category: keyof PhraseStorage): string[] {
    return this.phrases[category] || [];
  }

  static getAllSuggestions(): string[] {
    return [
      ...this.phrases.complaints,
      ...this.phrases.diagnostics,
      ...this.phrases.actions
    ];
  }

  static clearPhrases() {
    this.phrases = { complaints: [], diagnostics: [], actions: [] };
    this.savePhrases(this.phrases);
  }
}

export const usePhraseManager = () => {
  const [phrases, setPhrases] = useState<PhraseStorage>(PhraseManager.loadPhrases());

  useEffect(() => {
    const loaded = PhraseManager.loadPhrases();
    setPhrases(loaded);
  }, []);

  const addPhrase = (category: keyof PhraseStorage, phrase: string) => {
    PhraseManager.addPhrase(category, phrase);
    setPhrases(PhraseManager.loadPhrases());
  };

  const getSuggestionsForCategory = (category: keyof PhraseStorage) => {
    return PhraseManager.getPhrases(category);
  };

  const getAllSuggestions = () => {
    return PhraseManager.getAllSuggestions();
  };

  return {
    phrases,
    addPhrase,
    getSuggestionsForCategory,
    getAllSuggestions,
    clearPhrases: PhraseManager.clearPhrases
  };
};

export default PhraseManager;