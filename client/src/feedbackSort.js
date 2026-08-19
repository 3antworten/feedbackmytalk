// Shared ordering: highest score (upvotes − downvotes) first; ties favor the viewer's own
// feedback next; anything still tied (including 0-0, or for the speaker/no viewer) falls
// back to oldest first.
export function sortByVotes(items, viewerParticipantId) {
  return [...items].sort((a, b) => {
    const scoreDiff = (b.votes?.score || 0) - (a.votes?.score || 0);
    if (scoreDiff !== 0) return scoreDiff;
    if (viewerParticipantId) {
      const aMine = a.authorParticipantId === viewerParticipantId;
      const bMine = b.authorParticipantId === viewerParticipantId;
      if (aMine !== bMine) return aMine ? -1 : 1;
    }
    return new Date(a.created_at) - new Date(b.created_at);
  });
}

// Buckets items by slideId, in slide order, including slides with no feedback at all; each
// bucket's items are vote-sorted the same way as the flat list view.
export function groupBySlide(items, slides, viewerParticipantId) {
  const bySlide = new Map(slides.map((s) => [s.id, []]));
  for (const item of items) {
    if (!bySlide.has(item.slideId)) bySlide.set(item.slideId, []);
    bySlide.get(item.slideId).push(item);
  }
  return slides.map((slide) => ({ slide, items: sortByVotes(bySlide.get(slide.id) || [], viewerParticipantId) }));
}
