export interface RulesScreenProps {
  readonly onBack: () => void;
}

/**
 * Player-facing rules text (SPEC.md §2, rewritten for a reader — not a re-paste of the formal
 * spec language).
 */
export function RulesScreen({ onBack }: RulesScreenProps) {
  return (
    <main data-testid="rules-screen">
      <h1>How to play STARLEAP</h1>

      <section>
        <h2>Goal</h2>
        <p>Get all ten of your pegs into the star point opposite your own before anyone else.</p>
      </section>

      <section>
        <h2>Your turn</h2>
        <p>On your turn, move exactly one peg — either a single step, or one long-jump chain.</p>
      </section>

      <section>
        <h2>Steps</h2>
        <p>Move a peg to any empty neighboring cell.</p>
      </section>

      <section>
        <h2>Long jumps</h2>
        <p>
          Hop a peg over any other peg (yours or an opponent's) into the empty cell directly beyond it. Unlike
          classic Chinese Checkers, STARLEAP lets you hop over pegs that aren't right next to you too — as long as
          the gap in front of the pivot peg and the gap behind it are both clear and the same size, the hop is
          legal. Land, then hop again if another jump is available, chaining as many hops together as you like in
          one turn.
        </p>
      </section>

      <section>
        <h2>Passing through vs. resting</h2>
        <p>
          Mid-chain, you can hop through anyone's home corner. But when your turn ends, you can only be resting in
          your own starting corner, your own target corner, or the open middle of the board — never someone else's
          corner.
        </p>
      </section>

      <section>
        <h2>No going home again</h2>
        <p>Once a peg has left your starting corner, it can never rest there again.</p>
      </section>

      <button onClick={onBack}>Back</button>
    </main>
  );
}
