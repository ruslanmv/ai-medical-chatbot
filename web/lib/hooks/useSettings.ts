"use client";

import { useState, useEffect } from "react";
import type { Provider } from "../types";

export function useSettings() {
  const [provider, setProvider] = useState<Provider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem("medos_provider") as Provider;
    const savedApiKey = localStorage.getItem("medos_api_key");

    if (savedProvider) setProvider(savedProvider);
    if (savedApiKey) setApiKey(savedApiKey);

    setIsLoaded(true);
  }, []);

  // Save provider to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("medos_provider", provider);
    }
  }, [provider, isLoaded]);

  // Save API key to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("medos_api_key", apiKey);
    }
  }, [apiKey, isLoaded]);

  const clearApiKey = () => {
    setApiKey("");
    localStorage.removeItem("medos_api_key");
  };

  return {
    provider,
    setProvider,
    apiKey,
    setApiKey,
    clearApiKey,
    isLoaded,
  };
}
