// app/utils/diceRoller.ts

/**
 * Represents the result of a dice roll
 */
export interface DiceRollResult {
  total: number;
  rolls: number[];
  formula: string;
}

/**
 * Rolls dice based on a formula like "2d8+6"
 * @param numDice - Number of dice to roll
 * @param dieSize - Size of each die (e.g., 8 for d8)
 * @param modifier - Static modifier to add to the total
 * @returns The result of the roll
 */
export function rollDice(
  numDice: number,
  dieSize: number,
  modifier: number
): DiceRollResult {
  const rolls: number[] = [];

  // Roll each die
  for (let i = 0; i < numDice; i++) {
    // Math.random() gives [0, 1), so we multiply by dieSize and add 1
    // to get [1, dieSize]
    const roll = Math.floor(Math.random() * dieSize) + 1;
    rolls.push(roll);
  }

  // Calculate total
  const rollSum = rolls.reduce((sum, roll) => sum + roll, 0);
  const total = rollSum + modifier;

  // Build formula string for display
  const formula = `${numDice}d${dieSize}${modifier >= 0 ? '+' : ''}${modifier}`;

  return {
    total,
    rolls,
    formula,
  };
}

/**
 * Rolls HP for a monster based on its HP object
 * @param hp - The monster's HP data
 * @returns The rolled HP value and the formula used
 */
export function rollMonsterHP(hp: {
  numDice: number;
  dieSize: number;
  modifier: number;
}): DiceRollResult {
  return rollDice(hp.numDice, hp.dieSize, hp.modifier);
}
