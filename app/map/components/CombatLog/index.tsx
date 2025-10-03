import React, { useEffect, useRef } from 'react';
import { DamageEvent } from '../../types';
import styles from './style.module.css';

interface CombatLogProps {
  damageLog: DamageEvent[];
  maxEvents?: number;
}

export function CombatLog({ damageLog, maxEvents = 10 }: CombatLogProps) {
  const logTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // scroll to top for reverse-order updates
    logTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [damageLog]);

  // 10 most recent
  const recentEvents = damageLog.slice(-maxEvents).reverse();

  return (
    <div className={styles.combatLogContainer}>
      <div className={styles.combatLogHeader}>
        <h3>Combat Log</h3>
      </div>

      <div className={styles.combatLogEvents}>
        {/* Invisible div at the top - we scroll to this */}
        <div ref={logTopRef} />

        {recentEvents.length === 0 ? (
          <div className={styles.combatLogEmpty}>No combat events yet...</div>
        ) : (
          recentEvents.map((event, index) => (
            <div
              key={index}
              className={`${styles.combatLogEvent} ${index === 0 ? styles.mostRecent : ''}`}
            >
              <span className={styles.eventCharacter}>{event.characterName}</span>
              <span className={styles.eventText}>
                {' '}
                {event.amount > 0 ? ' hit for ' : ' healed for '}{' '}
              </span>
              <span className={styles.eventDamage}>{Math.abs(event.amount)}</span>
              <span className={styles.eventText}> {event.amount > 0 ? ' damage' : ' HP'}</span>

              {event.round !== undefined && (
                <span className={styles.eventRound}> (Round {event.round})</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
