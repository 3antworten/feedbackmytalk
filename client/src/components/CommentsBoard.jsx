import CommentItem from "./CommentItem";
import { sortByVotes, groupBySlide } from "../feedbackSort";
import { slideLabel } from "../format";

// Shared comments board for both the speaker's review page and the participant's Comments
// tab: a flat top-voted list, or the same items grouped by slide with a persistent
// thumbnail (every slide in the deck is shown, even with zero comments). `view` ("list" or
// "slides") is owned by the page so its toggle can live next to the page title.
export default function CommentsBoard({
  comments,
  slides,
  view,
  canModerate,
  canDeleteOwn = true,
  viewerParticipantId,
  onVote,
  onDelete,
}) {
  return (
    <div className="stack">
      {comments.length === 0 && view === "list" && (
        <div className="card">
          <p className="muted">No comments collected yet.</p>
        </div>
      )}

      {view === "list" &&
        sortByVotes(comments, viewerParticipantId).map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            showSlideRef
            isOwn={!canModerate && c.authorParticipantId === viewerParticipantId}
            canModerate={canModerate}
            canDeleteOwn={canDeleteOwn}
            onVote={onVote}
            onDelete={onDelete}
          />
        ))}

      {view === "slides" &&
        groupBySlide(comments, slides || [], viewerParticipantId).map(({ slide, items }) => (
          <div className="card" key={slide.id}>
            <div className="panel-columns">
              {slide.isGeneral ? (
                <div className="slide-image general-slide-placeholder" style={{ minHeight: 160 }}>
                  <strong>General</strong>
                  <span className="muted small">Not tied to a specific slide</span>
                </div>
              ) : (
                <img className="slide-image" src={slide.imagePath} alt={slideLabel(slide)} />
              )}
              <div className="stack">
                <strong>
                  {slideLabel(slide)} · {items.length} comment{items.length === 1 ? "" : "s"}
                </strong>
                {items.length === 0 && <p className="muted small">No comments on this slide.</p>}
                {items.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    showSlideRef={false}
                    isOwn={!canModerate && c.authorParticipantId === viewerParticipantId}
                    canModerate={canModerate}
                    canDeleteOwn={canDeleteOwn}
                    onVote={onVote}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
