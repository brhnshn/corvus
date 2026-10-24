import { useState, useEffect } from 'react';
import {
  readActiveSystem,
  setActiveSystem,
  ACTIVE_SYSTEM_CHANGED_EVENT,
  type ActiveSystem,
} from './activeSystemStore';

export function useActiveSystem(): {
  systemId: string;
  systemName: string;
  setActiveSystem: (id: string, name?: string) => void;
} {
  const [system, setSystem] = useState<ActiveSystem>(readActiveSystem);

  useEffect(() => {
    const handleSystemChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ systemId?: string; systemName?: string } | undefined>;
      const detail = customEvent.detail;
      if (detail && (detail.systemId || detail.systemName)) {
        const fallback = readActiveSystem();
        setSystem({
          id: detail.systemId || fallback.id,
          name: detail.systemName || fallback.name,
        });
      } else {
        setSystem(readActiveSystem());
      }
    };

    window.addEventListener(ACTIVE_SYSTEM_CHANGED_EVENT, handleSystemChange);
    return () => {
      window.removeEventListener(ACTIVE_SYSTEM_CHANGED_EVENT, handleSystemChange);
    };
  }, []);

  return {
    systemId: system.id,
    systemName: system.name,
    setActiveSystem,
  };
}
