// Small inline thumbnail for a slide reference (used on recap/review lists). Falls back to
// a plain tile for the trailing "general" slide, which has no rendered image.
export default function SlideThumb({ slide, width = 72 }) {
  if (!slide) return null;
  if (slide.isGeneral || !slide.imagePath) {
    return (
      <div className="slide-thumb slide-thumb-general" style={{ width }}>
        General
      </div>
    );
  }
  return <img className="slide-thumb" src={slide.imagePath} alt="" style={{ width }} />;
}
