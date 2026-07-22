import { createContext, useContext, useState } from 'react';

const IntegrationContext = createContext(null);

const DEFAULT_ADDED     = new Set(['google', 'slack', 'figma', 'notion', 'github', 'jira', 'openai', 'claude', 'gemini']);
const DEFAULT_CONNECTED = new Set(['google', 'slack', 'figma']);

export function IntegrationProvider({ children }) {
  const [added, setAdded]         = useState(DEFAULT_ADDED);
  const [connected, setConnected] = useState(DEFAULT_CONNECTED);

  return (
    <IntegrationContext.Provider value={{ added, setAdded, connected, setConnected }}>
      {children}
    </IntegrationContext.Provider>
  );
}

export function useIntegration() {
  return useContext(IntegrationContext);
}
