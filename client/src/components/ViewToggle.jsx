// Switches a feedback board between the flat top-voted list and the per-slide grouped
// view — a compact iOS-style on/off switch with a label on each side.
export default function ViewToggle({ view, onChange }) {
  const isSlides = view === "slides";
  return (
    <div className="view-toggle">
      <span className={`view-toggle-label${!isSlides ? " active" : ""}`}>Top voted</span>
      <span
        role="switch"
        aria-checked={isSlides}
        tabIndex={0}
        className={`ios-switch${isSlides ? " on" : ""}`}
        onClick={() => onChange(isSlides ? "list" : "slides")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onChange(isSlides ? "list" : "slides");
          }
        }}
      >
        <span className="ios-switch-knob" />
      </span>
      <span className={`view-toggle-label${isSlides ? " active" : ""}`}>By slide</span>
    </div>
  );
}
