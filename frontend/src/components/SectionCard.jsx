import React from "react";

function SectionCard({ title, subtitle, children, className = "" }) {
  return (
    <div className={`card ${className}`}>
      {title && <h2 className="card-title">{title}</h2>}
      {subtitle && <p className="card-subtitle">{subtitle}</p>}
      {children}
    </div>
  );
}

export default SectionCard;
