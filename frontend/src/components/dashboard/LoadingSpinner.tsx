'use client';

// ============== BASE SKELETON PRIMITIVES ==============

function Bone({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`bg-white/[0.04] rounded-lg animate-pulse ${className}`} style={style} />
  );
}

function SkeletonCard({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={`rounded-2xl bg-[#0d1117]/60 border border-white/[0.04] p-5 ${className}`}>
      {children}
    </div>
  );
}

// ============== PAGE SKELETON LAYOUTS ==============

/** Dashboard overview: stat cards + activity + info panels */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Bone className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Bone className="h-6 w-48" />
          <Bone className="h-4 w-32" />
        </div>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i}>
            <Bone className="h-4 w-20 mb-3" />
            <Bone className="h-8 w-24 mb-2" />
            <Bone className="h-3 w-16" />
          </SkeletonCard>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonCard className="space-y-3">
          <Bone className="h-5 w-32 mb-2" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone className="w-8 h-8 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Bone className="h-4 w-3/4" />
                <Bone className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </SkeletonCard>
        <SkeletonCard className="space-y-3">
          <Bone className="h-5 w-32 mb-2" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <Bone className="h-4 w-24" />
              <Bone className="h-4 w-32" />
            </div>
          ))}
        </SkeletonCard>
      </div>
    </div>
  );
}

/** Usage page: stat cards + chart area + info grid */
export function UsageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-2">
        <Bone className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Bone className="h-6 w-36" />
          <Bone className="h-4 w-48" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i}>
            <Bone className="h-4 w-20 mb-3" />
            <Bone className="h-8 w-28 mb-2" />
            <Bone className="h-3 w-16" />
          </SkeletonCard>
        ))}
      </div>

      {/* Chart area */}
      <SkeletonCard className="h-64 flex flex-col">
        <Bone className="h-5 w-32 mb-4" />
        <div className="flex-1 flex items-end gap-2 px-4">
          {[...Array(12)].map((_, i) => (
            <Bone
              key={i}
              className="flex-1 rounded-t-md"
              style={{ height: `${20 + Math.random() * 60}%` } as React.CSSProperties}
            />
          ))}
        </div>
      </SkeletonCard>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <SkeletonCard key={i} className="space-y-3">
            <Bone className="h-5 w-32 mb-2" />
            {[...Array(3)].map((_, j) => (
              <div key={j} className="flex justify-between">
                <Bone className="h-4 w-24" />
                <Bone className="h-4 w-20" />
              </div>
            ))}
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

/** Memory page: header + grid of memory cards */
export function MemorySkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-2">
        <Bone className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Bone className="h-6 w-32" />
          <Bone className="h-4 w-56" />
        </div>
        <div className="ml-auto">
          <Bone className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <SkeletonCard key={i}>
            <Bone className="h-4 w-16 mb-2" />
            <Bone className="h-7 w-12" />
          </SkeletonCard>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {[...Array(6)].map((_, i) => (
          <Bone key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Memory cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Bone className="w-6 h-6 rounded-md" />
              <Bone className="h-4 w-16" />
              <div className="ml-auto">
                <Bone className="h-3 w-12" />
              </div>
            </div>
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-3/4" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

/** Skills page: grid of skill cards */
export function SkillsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-2">
        <Bone className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Bone className="h-6 w-32" />
          <Bone className="h-4 w-48" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} className="space-y-3">
            <div className="flex items-center gap-3">
              <Bone className="w-10 h-10 rounded-xl" />
              <div className="space-y-1.5">
                <Bone className="h-5 w-24" />
                <Bone className="h-3 w-16" />
              </div>
            </div>
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-2/3" />
            <Bone className="h-9 w-full rounded-lg" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

/** Settings / generic: form-like skeleton */
export function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-2">
        <Bone className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Bone className="h-6 w-32" />
          <Bone className="h-4 w-48" />
        </div>
      </div>

      {[...Array(3)].map((_, i) => (
        <SkeletonCard key={i} className="space-y-4">
          <Bone className="h-5 w-32" />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Bone className="h-3 w-16" />
              <Bone className="h-10 w-full rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Bone className="h-3 w-20" />
              <Bone className="h-10 w-full rounded-lg" />
            </div>
          </div>
          <Bone className="h-10 w-32 rounded-lg" />
        </SkeletonCard>
      ))}
    </div>
  );
}

/** Support page: ticket list skeleton */
export function SupportSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-2">
        <Bone className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Bone className="h-6 w-32" />
          <Bone className="h-4 w-48" />
        </div>
        <div className="ml-auto">
          <Bone className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      {[...Array(4)].map((_, i) => (
        <SkeletonCard key={i}>
          <div className="flex items-center gap-3">
            <Bone className="w-3 h-3 rounded-full" />
            <Bone className="h-5 w-48" />
            <div className="ml-auto flex gap-2">
              <Bone className="h-6 w-16 rounded-full" />
              <Bone className="h-6 w-20 rounded-full" />
            </div>
          </div>
          <Bone className="h-4 w-3/4 mt-2" />
          <Bone className="h-3 w-24 mt-2" />
        </SkeletonCard>
      ))}
    </div>
  );
}

/** Generic page skeleton fallback */
export function PageSkeleton() {
  return <DashboardSkeleton />;
}

/** Keep old PageLoader as alias for backward compat (but now it's a skeleton) */
export function PageLoader() {
  return <DashboardSkeleton />;
}


/** Small inline spinner for buttons — keeps the spin animation */
export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <svg className={`${sizeClasses[size]} text-[#f43f5e] animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export default LoadingSpinner;
