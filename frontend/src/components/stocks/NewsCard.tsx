import type { MarketNews } from "@/types";
import { ExternalLink } from "lucide-react";

function timeAgo(unixTimestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - unixTimestamp);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function NewsCard({ article }: { article: MarketNews }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-600"
    >
      <div className="flex gap-4">
        {article.image && (
          <img
            src={article.image}
            alt=""
            className="h-20 w-28 flex-shrink-0 rounded-lg object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div className="min-w-0 flex-1">
          <h4 className="mb-1 line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400">
            {article.headline}
            <ExternalLink className="ml-1 inline h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </h4>
          <p className="mb-2 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
            {article.summary}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <span className="font-medium">{article.source}</span>
            <span>&middot;</span>
            <span>{timeAgo(article.datetime)}</span>
          </div>
        </div>
      </div>
    </a>
  );
}
