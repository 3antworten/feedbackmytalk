import { useState } from "react";

// Wraps a slide reference (e.g. "3. Roadmap") so hovering it pops up a thumbnail preview.
export default function SlideRefHover({ slide, children }) {
  const [hover, setHover] = useState(false);
  return (
    <span
      className="slide-ref-hover"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      tabIndex={0}
    >
      {children}
      {hover && (
        <span className="slide-ref-popover">
          {slide?.imagePath ? (
            <img src={slide.imagePath} alt="" />
          ) : (
            <span className="slide-thumb-general" style={{ display: "flex", width: "100%", height: "100%" }}>
              General
            </span>
          )}
        </span>
      )}
    </span>
  );
}
