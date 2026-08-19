// Thumbs up/down control with counts. Clicking the already-active direction removes the
// vote (toggle); clicking the other direction switches it. When `interactive` is false
// (the speaker), it's a plain read-only indicator — no clicks. When `hideEmpty` is true,
// a direction with zero votes isn't shown at all (and nothing renders if there are none).
export default function VoteWidget({ votes, onVote, interactive = true, hideEmpty = false }) {
  const myVote = votes?.myVote || 0;
  const up = votes?.up || 0;
  const down = votes?.down || 0;

  if (hideEmpty && up === 0 && down === 0) return null;

  function toggle(value) {
    if (!interactive) return;
    onVote(myVote === value ? 0 : value);
  }

  const Tag = interactive ? "button" : "span";

  return (
    <span className="vote-widget">
      {(!hideEmpty || up > 0) && (
        <Tag
          type={interactive ? "button" : undefined}
          className={`vote-btn${!interactive ? " read-only" : ""}${myVote === 1 ? " active-up" : ""}`}
          onClick={interactive ? () => toggle(1) : undefined}
          title="Upvote"
        >
          👍 <span className="vote-count">{up}</span>
        </Tag>
      )}
      {(!hideEmpty || down > 0) && (
        <Tag
          type={interactive ? "button" : undefined}
          className={`vote-btn${!interactive ? " read-only" : ""}${myVote === -1 ? " active-down" : ""}`}
          onClick={interactive ? () => toggle(-1) : undefined}
          title="Downvote"
        >
          👎 <span className="vote-count">{down}</span>
        </Tag>
      )}
    </span>
  );
}
