import VoteWidget from "./VoteWidget";
import SlideRefHover from "./SlideRefHover";
import { slideLabel } from "../format";

function slideOf(item) {
  return {
    imagePath: item.slideImagePath,
    isGeneral: item.slideIsGeneral,
    title: item.slideTitle,
    orderIndex: item.slideOrderIndex,
  };
}

// Renders one comment row. `showSlideRef` shows an inline slide link (list view); in the
// grouped-by-slide view the slide is already implied by the surrounding section, so it's
// omitted. `isOwn` only ever applies to participants (speakers see everything the same).
export default function CommentItem({
  comment,
  showSlideRef,
  isOwn,
  canModerate,
  canDeleteOwn = true,
  sessionOpen = true,
  onVote,
  onDelete,
}) {
  return (
    <div className={`item-entry${isOwn ? " own" : ""}`}>
      <div className="meta row between">
        <span>
          {isOwn ? "You" : comment.author}
          {showSlideRef && (
            <>
              {" · "}
              <SlideRefHover slide={slideOf(comment)}>{slideLabel(slideOf(comment))}</SlideRefHover>
            </>
          )}
          {" · "}
          {new Date(comment.created_at).toLocaleString()}
        </span>
        {(canModerate || (isOwn && canDeleteOwn)) && (
          <button className="ghost small" onClick={() => onDelete(comment.id)} title="Delete">
            ✕
          </button>
        )}
      </div>
      <div className="feedback-content">{comment.text}</div>
      <div className="feedback-footer row between">
        <VoteWidget
          votes={comment.votes}
          onVote={(value) => onVote(comment.id, value)}
          interactive={!canModerate && sessionOpen}
          hideEmpty={canModerate}
        />
      </div>
    </div>
  );
}
