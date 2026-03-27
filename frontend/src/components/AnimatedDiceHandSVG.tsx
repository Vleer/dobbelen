import React, { useEffect, useRef, useState } from "react";
import DiceSVG from "./DiceSVG";
import { useSettings } from "../contexts/SettingsContext";

interface AnimatedDiceHandSVGProps {
  diceValues: number[];
  size?: 'xs' | 'sm' | 'md' | 'lg';
  vertical?: boolean;
  noWrap?: boolean;
}

type RollPhase = 'idle' | 'rolling' | 'landing';

const AnimatedDiceHandSVG: React.FC<AnimatedDiceHandSVGProps> = ({
  diceValues,
  size = 'md',
  vertical = false,
  noWrap = false,
}) => {
  const { animationsEnabled } = useSettings();
  const [displayValues, setDisplayValues] = useState<number[]>(diceValues);
  const [phase, setPhase] = useState<RollPhase>('idle');

  const prevKeyRef = useRef(diceValues.join(','));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const landTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (rollTimeoutRef.current) { clearTimeout(rollTimeoutRef.current); rollTimeoutRef.current = null; }
    if (landTimeoutRef.current) { clearTimeout(landTimeoutRef.current); landTimeoutRef.current = null; }
  };

  useEffect(() => {
    const newKey = diceValues.join(',');
    const changed = newKey !== prevKeyRef.current;
    prevKeyRef.current = newKey;

    if (!changed) return;

    if (!animationsEnabled || diceValues.length === 0) {
      setDisplayValues(diceValues);
      return;
    }

    clearTimers();
    setPhase('rolling');

    // Rapidly cycle random face values to simulate rolling
    intervalRef.current = setInterval(() => {
      setDisplayValues(diceValues.map(() => Math.floor(Math.random() * 6) + 1));
    }, 75);

    // After ~950ms, snap to real values with landing animation
    rollTimeoutRef.current = setTimeout(() => {
      clearTimers();
      setPhase('landing');
      setDisplayValues(diceValues);

      landTimeoutRef.current = setTimeout(() => {
        setPhase('idle');
      }, 500);
    }, 950);

    return clearTimers;
  // Use string key to avoid stale-closure issues with array identity
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diceValues.join(','), animationsEnabled]);

  // If animations get toggled off mid-roll, stop immediately
  useEffect(() => {
    if (!animationsEnabled) {
      clearTimers();
      setDisplayValues(diceValues);
      setPhase('idle');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationsEnabled]);

  return (
    <div className={`flex gap-1.5 min-w-0 justify-center items-center ${vertical ? 'flex-col' : noWrap ? 'flex-nowrap' : 'flex-wrap'}`}>
      {displayValues.map((value, index) => (
        <div
          key={index}
          className={`min-w-8 min-h-8 flex items-center justify-center ${
            phase === 'rolling'
              ? 'animate-dice-roll'
              : phase === 'landing'
              ? 'animate-dice-land'
              : ''
          }`}
          style={{
            animationDelay: phase === 'landing' ? `${index * 55}ms` : '0ms',
          }}
        >
          <DiceSVG value={value} size={size} />
        </div>
      ))}
    </div>
  );
};

export default AnimatedDiceHandSVG;
