import QuestionItem from "./QuestionItem";
import { sortByVotes, groupBySlide } from "../feedbackSort";
import { slideLabel } from "../format";

// Shared questions board for both the speaker's review page and the participant's
// Questions tab: a flat top-voted list, or the same items grouped by slide with a
// persistent thumbnail. `onToggleAskedLive`/`onSaveNote` are only offered to participants
// (never the speaker) — but for every question, not just the viewer's own, since asked-live
// is shared and everyone gets their own note on how it landed.
export default function QuestionsBoard({
  questions,
  slides,
  view,
  canModerate,
  canDeleteOwn = true,
  sessionOpen = true,
  viewerParticipantId,
  onVote,
  onDelete,
  onToggleAskedLive,
  onSaveNote,
}) {
  function isOwn(q) {
    return !canModerate && q.authorParticipantId === viewerParticipantId;
  }

  return (
    <div className="stack">
      {questions.length === 0 && view === "list" && (
        <div className="card">
          <p className="muted">No questions collected yet.</p>
        </div>
      )}

      {view === "list" &&
        sortByVotes(questions, viewerParticipantId).map((q) => (
          <QuestionItem
            key={q.id}
            question={q}
            showSlideRef
            isOwn={isOwn(q)}
            canModerate={canModerate}
            canDeleteOwn={canDeleteOwn}
            sessionOpen={sessionOpen}
            onVote={onVote}
            onDelete={onDelete}
            onToggleAskedLive={onToggleAskedLive}
            onSaveNote={onSaveNote}
          />
        ))}

      {view === "slides" &&
        groupBySlide(questions, slides || [], viewerParticipantId).map(({ slide, items }) => (
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
                  {slideLabel(slide)} · {items.length} question{items.length === 1 ? "" : "s"}
                </strong>
                {items.length === 0 && <p className="muted small">No questions on this slide.</p>}
                {items.map((q) => (
                  <QuestionItem
                    key={q.id}
                    question={q}
                    showSlideRef={false}
                    isOwn={isOwn(q)}
                    canModerate={canModerate}
                    canDeleteOwn={canDeleteOwn}
                    sessionOpen={sessionOpen}
                    onVote={onVote}
                    onDelete={onDelete}
                    onToggleAskedLive={onToggleAskedLive}
                    onSaveNote={onSaveNote}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
