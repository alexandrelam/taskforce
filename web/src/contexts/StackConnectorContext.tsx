import { createContext, useContext, useCallback, useRef, type ReactNode } from "react";

interface StackConnectorContextValue {
  registerCardRef: (ticketId: string, element: HTMLElement) => void;
  unregisterCardRef: (ticketId: string) => void;
  getCardRefs: () => Map<string, HTMLElement>;
}

const StackConnectorContext = createContext<StackConnectorContextValue | null>(null);

export function useStackConnector() {
  const ctx = useContext(StackConnectorContext);
  if (!ctx) throw new Error("useStackConnector must be used within StackConnectorProvider");
  return ctx;
}

export function StackConnectorProvider({ children }: { children: ReactNode }) {
  const cardRefs = useRef(new Map<string, HTMLElement>());

  const registerCardRef = useCallback((ticketId: string, element: HTMLElement) => {
    cardRefs.current.set(ticketId, element);
  }, []);

  const unregisterCardRef = useCallback((ticketId: string) => {
    cardRefs.current.delete(ticketId);
  }, []);

  const getCardRefs = useCallback(() => cardRefs.current, []);

  return (
    <StackConnectorContext.Provider value={{ registerCardRef, unregisterCardRef, getCardRefs }}>
      {children}
    </StackConnectorContext.Provider>
  );
}
