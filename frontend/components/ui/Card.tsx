"use client";

import React from "react";

/* -------------------------------------------------------------------------- */
/*  Card — conteneur de surface unique (remplace les div bg-white ad hoc)     */
/* -------------------------------------------------------------------------- */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  as?: "div" | "section" | "article";
}

const PADDING_CLASSES = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-6 sm:p-8",
} as const;

export function Card({
  padding = "md",
  as: Tag = "div",
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={`bg-white rounded-xl shadow-sm border border-neutral-200 ${PADDING_CLASSES[padding]} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Card;
