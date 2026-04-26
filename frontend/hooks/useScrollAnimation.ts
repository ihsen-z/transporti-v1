"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Custom hook for scroll-triggered animations using IntersectionObserver.
 * Returns a ref to attach to the element and whether it's visible.
 */
export function useScrollAnimation(
  threshold = 0.1,
  rootMargin = "0px 0px -50px 0px",
) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element); // Only animate once
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin]);

  return { ref, isVisible };
}

/**
 * Generates staggered animation delay for children.
 */
export function getStaggerDelay(index: number, baseDelay = 0.1): string {
  return `${index * baseDelay}s`;
}
