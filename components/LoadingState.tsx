type LoadingStateProps = {
  variant?: "skeleton" | "spinner";
  message?: string;
  /** Pro skeleton: počet řádků/karet */
  count?: number;
};

/** Skeleton pro seznamy a gridy (např. dashboard, project detail) */
function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-apple bg-white shadow-apple-sm" />
      ))}
    </div>
  );
}

/** Skeleton pro detail stránku (např. project detail) */
function SkeletonDetail() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-32 animate-pulse rounded-lg bg-white shadow-apple-sm" />
      <div className="h-32 animate-pulse rounded-apple bg-white shadow-apple" />
      <div className="h-48 animate-pulse rounded-apple bg-white shadow-apple" />
    </div>
  );
}

/** Spinner pro akce (např. AI generování) */
function Spinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
        aria-hidden
      />
      {message ? (
        <p className="text-[14px] text-apple-text-secondary">{message}</p>
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
