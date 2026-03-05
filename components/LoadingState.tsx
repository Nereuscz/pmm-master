type LoadingStateProps = {
  variant?: "skeleton" | "spinner";
  message?: string;
  /** Pro skeleton: počet řádků/karet */
  count?: number;
};

/** Skeleton pro seznamy a gridy (např. dashboard, project detail) */
function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-busy="true" aria-label="Načítání">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-apple bg-white shadow-apple-sm">
          <div className="p-5 space-y-3">
            <div className="skeleton-shimmer h-4 w-3/5 rounded-md" />
            <div className="skeleton-shimmer h-3 w-2/5 rounded-md" />
            <div className="skeleton-shimmer h-5 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton pro detail stránku (např. project detail) */
function SkeletonDetail() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Načítání">
      <div className="skeleton-shimmer h-5 w-32 rounded-lg" />
      <div className="overflow-hidden rounded-apple bg-white shadow-apple">
        <div className="p-6 space-y-3">
          <div className="skeleton-shimmer h-5 w-1/3 rounded-md" />
          <div className="skeleton-shimmer h-3 w-2/3 rounded-md" />
          <div className="skeleton-shimmer h-3 w-1/2 rounded-md" />
        </div>
      </div>
      <div className="overflow-hidden rounded-apple bg-white shadow-apple">
        <div className="p-6 space-y-3">
          <div className="skeleton-shimmer h-4 w-1/4 rounded-md" />
          <div className="skeleton-shimmer h-3 w-full rounded-md" />
          <div className="skeleton-shimmer h-3 w-4/5 rounded-md" />
          <div className="skeleton-shimmer h-3 w-3/5 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** Spinner pro akce (např. AI generování) */
function Spinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12" aria-busy="true" aria-label={message ?? "Načítání"}>
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
        aria-hidden
      />
      {message ? (
        <p className="text-body text-apple-text-secondary">{message}</p>
      ) : null}
    </div>
  );
}

export default function LoadingState({
  variant = "skeleton",
  message,
  count = 4
}: LoadingStateProps) {
  if (variant === "spinner") {
    return <Spinner message={message} />;
  }
  if (variant === "skeleton" && message) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-apple bg-white py-16 shadow-apple">
        <Spinner message={message} />
      </div>
    );
  }
  return <SkeletonGrid count={count} />;
}

export { SkeletonGrid, SkeletonDetail, Spinner };
