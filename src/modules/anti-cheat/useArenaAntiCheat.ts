// src/modules/anti-cheat/useArenaAntiCheat.ts
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';

interface AntiCheatOptions {
  matchId: string | null;
  playerSlot: 'P1' | 'P2';
  isActive: boolean;
  maxAllowedSwitches?: number;
  onViolationWarning?: (count: number, disqualified: boolean) => void;
}

export function useArenaAntiCheat({
  matchId,
  playerSlot,
  isActive,
  maxAllowedSwitches = 2,
  onViolationWarning,
}: AntiCheatOptions) {
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [isDisqualified, setIsDisqualified] = useState<boolean>(false);
  const lastLeaveTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive || typeof document === 'undefined' || typeof window === 'undefined') return;

    const registerViolation = async () => {
      setTabSwitchCount((prev) => {
        const nextCount = prev + 1;
        const disqualified = nextCount > maxAllowedSwitches;
        if (disqualified) setIsDisqualified(true);

        if (onViolationWarning) {
          onViolationWarning(nextCount, disqualified);
        }

        if (supabase && matchId) {
          const updateField =
            playerSlot === 'P1'
              ? { tab_switch_count_p1: nextCount, ...(disqualified ? { is_disqualified: true } : {}) }
              : { tab_switch_count_p2: nextCount, ...(disqualified ? { is_disqualified: true } : {}) };

          supabase.from('matches').update(updateField).eq('id', matchId).then(() => {});
        }

        return nextCount;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastLeaveTimeRef.current = Date.now();
      } else if (lastLeaveTimeRef.current) {
        const awayMs = Date.now() - lastLeaveTimeRef.current;
        lastLeaveTimeRef.current = null;
        if (awayMs >= 1500) {
          registerViolation();
        }
      }
    };

    const handleWindowBlur = () => {
      lastLeaveTimeRef.current = Date.now();
    };

    const handleWindowFocus = () => {
      if (lastLeaveTimeRef.current) {
        const awayMs = Date.now() - lastLeaveTimeRef.current;
        lastLeaveTimeRef.current = null;
        if (awayMs >= 1500) {
          registerViolation();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [isActive, matchId, playerSlot, maxAllowedSwitches]);

  return { tabSwitchCount, isDisqualified };
}