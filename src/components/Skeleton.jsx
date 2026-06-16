// src/components/Skeleton.jsx
import React from 'react';

// ── Base shimmer ─────────────────────────────────────────────────────────────
export function Skeleton({ className = '', rounded = 'rounded-lg' }) {
  return (
    <div className={`relative overflow-hidden bg-white/5 ${rounded} ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite]
                      bg-gradient-to-r from-transparent via-white/8 to-transparent" />
    </div>
  );
}

// ── Stat card skeleton ───────────────────────────────────────────────────────
export function StatCardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-6 w-24" />
    </div>
  );
}

// ── Profile header skeleton ──────────────────────────────────────────────────
export function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <Skeleton className="h-28 w-full" rounded="rounded-none" />
        <div className="px-6 pb-6 -mt-10 space-y-3">
          <Skeleton className="w-20 h-20" rounded="rounded-2xl" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-2 w-full" rounded="rounded-full" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ── List item skeleton ───────────────────────────────────────────────────────
export function ListItemSkeleton({ lines = 2 }) {
  return (
    <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl
                    border border-white/5">
      <Skeleton className="w-10 h-10 flex-shrink-0" rounded="rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        {lines >= 2 && <Skeleton className="h-3 w-1/2" />}
        {lines >= 3 && <Skeleton className="h-3 w-2/3" />}
      </div>
    </div>
  );
}

// ── Story card skeleton ──────────────────────────────────────────────────────
export function StoryCardSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl
                    border border-white/5">
      <Skeleton className="w-10 h-10 flex-shrink-0" rounded="rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

// ── Challenge card skeleton ──────────────────────────────────────────────────
export function ChallengeSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-16" rounded="rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="space-y-2 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" rounded="rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ── Hub challenge skeleton ───────────────────────────────────────────────────
export function HubChallengeSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 flex-shrink-0" rounded="rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-8 w-20" rounded="rounded-lg" />
        <Skeleton className="h-8 w-16" rounded="rounded-lg" />
      </div>
    </div>
  );
}

// ── Leaderboard row skeleton ─────────────────────────────────────────────────
export function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl
                    border border-white/5">
      <Skeleton className="w-8 h-8 flex-shrink-0" rounded="rounded-lg" />
      <Skeleton className="w-10 h-10 flex-shrink-0" rounded="rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2 w-20" />
      </div>
      <Skeleton className="h-4 w-14" />
    </div>
  );
}

// ── Page-level full skeleton (used in Suspense fallback) ─────────────────────
export function PageSkeleton({ rows = 5 }) {
  return (
    <div className="min-h-screen bg-[#060612] px-4 py-6 max-w-2xl mx-auto space-y-4">
      {/* Nav bar */}
      <div className="flex items-center justify-between py-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Content rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <ListItemSkeleton key={i} lines={2} />
      ))}
    </div>
  );
}
