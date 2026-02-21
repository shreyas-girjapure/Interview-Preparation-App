import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlaylistDashboardItem } from "@/lib/interview/playlists";

type PlaylistCardItem = Pick<
  PlaylistDashboardItem,
  | "slug"
  | "title"
  | "description"
  | "playlistType"
  | "accessLevel"
  | "totalItems"
  | "uniqueTopicCount"
> &
  Partial<Pick<PlaylistDashboardItem, "itemsRead" | "completionPercent">>;

type PlaylistCardVariant = "featured" | "dashboard";

const VARIANT_STYLES: Record<PlaylistCardVariant, string> = {
  featured:
    "rounded-xl border border-border/80 bg-card/70 p-4 transition-all duration-300 ease-out hover:border-primary/50 hover:shadow-[0_0_20px_rgba(inherit,0.1)] hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 active:shadow-none bg-card",
  dashboard:
    "rounded-2xl border border-border/70 bg-card/70 p-5 shadow-[0_1px_0_0_rgba(0,0,0,0.03)] transition-all duration-300 ease-out hover:border-primary/50 hover:shadow-[0_0_20px_rgba(inherit,0.1)] hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 active:shadow-none bg-card",
};

export function PlaylistCard({
  playlist,
  variant = "featured",
  showProgress = true,
  staggerIndex,
}: {
  playlist: PlaylistCardItem;
  variant?: PlaylistCardVariant;
  showProgress?: boolean;
  staggerIndex?: number;
}) {
  const itemsRead = playlist.itemsRead ?? 0;
  const completionPercent = playlist.completionPercent ?? 0;

  const cardBody = (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge variant="outline" className="capitalize">
          {playlist.playlistType}
        </Badge>
        <Badge variant="outline" className="capitalize">
          {playlist.accessLevel}
        </Badge>
      </div>

      <h3 className="font-serif text-2xl leading-tight tracking-tight">
        {playlist.title}
      </h3>

      {showProgress ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            {itemsRead}/{playlist.totalItems} completed | {completionPercent}%
          </p>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground/80"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </>
      ) : null}

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between rounded-md border border-border/70 bg-background/45 px-3 py-2">
          <dt className="text-muted-foreground">Questions</dt>
          <dd className="font-semibold">{playlist.totalItems}</dd>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border/70 bg-background/45 px-3 py-2">
          <dt className="text-muted-foreground">Topics covered</dt>
          <dd className="font-semibold">{playlist.uniqueTopicCount}</dd>
        </div>
      </dl>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {playlist.description}
      </p>
    </>
  );

  const wrapperClassName = cn(
    "block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    staggerIndex !== undefined &&
      "animate-in fade-in slide-in-from-bottom-4 fill-mode-both",
    VARIANT_STYLES[variant],
  );

  const animationStyle =
    staggerIndex !== undefined
      ? { animationDelay: `${staggerIndex * 100}ms` }
      : undefined;

  if (!playlist.slug) {
    return (
      <article className={wrapperClassName} style={animationStyle}>
        {cardBody}
      </article>
    );
  }

  return (
    <Link
      href={`/playlists/${playlist.slug}`}
      className={wrapperClassName}
      style={animationStyle}
    >
      {cardBody}
    </Link>
  );
}
