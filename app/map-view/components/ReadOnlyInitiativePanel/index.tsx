import { StatusBadge } from '@/app/components/StatusBadge';
import { Badge } from '@/app/components/ui/badge';
import { useUserMapContext } from '../../context/UserMapContext';
import styles from './style.module.css';

const ReadOnlyInitiativePanel = () => {
  const { state } = useUserMapContext();
  const { gameState, selectedCharacterId } = state;
  const { characters, currentTurn, round } = gameState;

  const sortedCharacters = [...characters].sort(
    (a, b) => b.initiative - a.initiative
  );

  return (
    <div className={styles.gridContainer}>
      <h2 className="">Initiative Order</h2>

      <div>
        <span>Round: {round}</span>
      </div>
      {sortedCharacters.map((char, index) => {
        const isCurrentTurn = index === currentTurn;
        const isSelected = char.id === selectedCharacterId;
        return (
          <div
            key={char.id}
            className={
              styles.card +
              ' ' +
              (isCurrentTurn ? styles.currentPlayer : '') +
              ' ' +
              (isSelected ? styles.selectedPlayer : '')
            }
          >
            <div className={styles.nameAndInitiative}>
              <div className={styles.nameBadge}>
                <span className="">{char.name}</span>
              </div>
              <div className={styles.initiativeBadge}>
                <span>Init:</span>
                <Badge variant="outline">
                  <span className="">{char.initiative}</span>
                </Badge>
              </div>
            </div>

            <div className={styles.hpAndDamage}>
              {char.isPlayer ? (
                <span>
                  HP: {char.hp}/{char.maxHp}
                </span>
              ) : (
                <span>DMG: {char.totalDamage}</span>
              )}
              <Badge variant={char.isPlayer ? 'default' : 'secondary'}>
                {char.isPlayer ? 'PC' : 'NPC'}
              </Badge>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-1 mt-2">
              {char.hasAdvantage && <StatusBadge kind="ADV">ADV</StatusBadge>}
              {char.hasDisadvantage && (
                <StatusBadge kind="DIS">DIS</StatusBadge>
              )}
              {char.concentrating && (
                <StatusBadge kind="CONC">CONC</StatusBadge>
              )}
              {char.conditions?.map((c) => (
                <StatusBadge key={c} kind="COND" title={c}>
                  {c}
                </StatusBadge>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default ReadOnlyInitiativePanel;
