export const GITHUB_REPO_URL = "https://github.com/aigentive/wirediagram";

export function GithubRepoLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={GITHUB_REPO_URL}
      target="_blank"
      rel="noreferrer"
      aria-label="Open GitHub repository"
      title="Open GitHub repository"
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border border-wire bg-wire-surface px-2.5 text-[13px] font-bold text-wire-secondary no-underline transition-colors hover:border-wire-strong hover:text-wire-primary ${className}`}
    >
      <GithubMark />
      <span className="hidden sm:inline">GitHub</span>
    </a>
  );
}

function GithubMark() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
      <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.34c-2.23.49-2.7-1.08-2.7-1.08-.36-.93-.89-1.18-.89-1.18-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82A7.56 7.56 0 0 1 8 3.88c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.18c0 .21.15.46.55.38A8 8 0 0 0 8 0Z" />
    </svg>
  );
}
