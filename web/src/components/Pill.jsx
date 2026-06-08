"use client";

import React from "react";

/**
 * Generic pill button.
 * Props: active, disabled, onClick, className, title, children
 */
export default function Pill({
  active,
  disabled,
  onClick,
  className = "",
  title,
  children,
}) {
  const classes = [
    "pill",
    active ? "active" : "",
    disabled ? "disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}
