import clsx from "clsx";

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent text-indigo-600 dark:text-indigo-400",
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-10 w-10" />
    </div>
  );
}
