'use client';

import React from 'react';

interface SkeletonProps {
    className?: string;
    /** Width in Tailwind units, e.g. 'w-24', 'w-full' */
    width?: string;
    /** Height in Tailwind units, e.g. 'h-4', 'h-8' */
    height?: string;
    /** Use 'rounded-full' for circular skeletons */
    rounded?: string;
}

/**
 * Reusable skeleton loading placeholder component.
 * Uses the shimmer animation defined in globals.css.
 */
export function Skeleton({
    className = '',
    width = 'w-full',
    height = 'h-4',
    rounded = 'rounded'
}: SkeletonProps) {
    return (
        <div
            className={`skeleton ${width} ${height} ${rounded} ${className}`}
            aria-hidden="true"
        />
    );
}

/**
 * Skeleton variant for a stat card (matches StatCard layout).
 */
export function StatCardSkeleton() {
    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-100">
            <div className="flex items-center gap-4">
                <Skeleton width="w-12" height="h-12" rounded="rounded-xl" />
                <div className="flex-1 space-y-2">
                    <Skeleton width="w-20" height="h-3" />
                    <Skeleton width="w-16" height="h-6" />
                </div>
            </div>
        </div>
    );
}

/**
 * Skeleton for a CTA hero banner.
 */
export function HeroBannerSkeleton() {
    return (
        <div className="skeleton rounded-2xl h-40 w-full" />
    );
}

/**
 * Skeleton for a table row.
 */
export function TableRowSkeleton() {
    return (
        <div className="flex items-center gap-4 py-4 px-4 border-b border-neutral-100">
            <Skeleton width="w-8" height="h-8" rounded="rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton width="w-48" height="h-3" />
                <Skeleton width="w-32" height="h-3" />
            </div>
            <Skeleton width="w-16" height="h-6" rounded="rounded-full" />
        </div>
    );
}

/**
 * Dashboard skeleton: full loading state for the dashboard page.
 */
export function DashboardSkeleton() {
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome skeleton */}
            <div className="space-y-2">
                <Skeleton width="w-64" height="h-8" />
                <Skeleton width="w-96" height="h-4" />
            </div>

            {/* Hero banner skeleton */}
            <HeroBannerSkeleton />

            {/* Stat cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </div>

            {/* Table skeleton */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-100">
                <div className="p-6 border-b border-neutral-100">
                    <Skeleton width="w-48" height="h-6" />
                </div>
                <TableRowSkeleton />
                <TableRowSkeleton />
                <TableRowSkeleton />
            </div>
        </div>
    );
}
