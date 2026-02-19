import { Badge } from "@/components/ui/badge";

type DemoPlaylist = {
  title: string;
  description: string;
  playlistType: "company" | "role" | "custom";
  accessLevel: "free" | "preview" | "paid";
  totalItems: number;
  uniqueTopicCount: number;
};

type PlaylistCardSample = {
  id: string;
  name: string;
  summary: string;
  group: "Theme-aligned" | "Exploratory";
  renderCard: (playlist: DemoPlaylist) => React.ReactNode;
};

const DEMO_PLAYLIST: DemoPlaylist = {
  title: "Enterprise Screening Pack",
  description:
    "Focused question set for backend interview loops with practical prompts and clear progression.",
  playlistType: "company",
  accessLevel: "preview",
  totalItems: 8,
  uniqueTopicCount: 5,
};

function MetaBadges({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="capitalize">
        {playlist.playlistType}
      </Badge>
      <Badge variant="outline" className="capitalize">
        {playlist.accessLevel}
      </Badge>
    </div>
  );
}

function CardOne({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/75 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <MetaBadges playlist={playlist} />
        <Badge variant="secondary" className="shrink-0">
          {playlist.totalItems} questions
        </Badge>
      </div>
      <h3 className="font-serif text-2xl leading-tight tracking-tight">
        {playlist.title}
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border/70 bg-background/50 px-3 py-2">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Questions
          </p>
          <p className="text-sm font-semibold">{playlist.totalItems}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/50 px-3 py-2">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Topics covered
          </p>
          <p className="text-sm font-semibold">{playlist.uniqueTopicCount}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {playlist.description}
      </p>
    </div>
  );
}

function CardTwo({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <MetaBadges playlist={playlist} />
      <h3 className="mt-3 font-serif text-2xl leading-tight tracking-tight">
        {playlist.title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {playlist.description}
      </p>
      <div className="mt-4 border-t border-border/70 pt-3">
        <p className="text-sm font-medium text-foreground/80">
          Questions {playlist.totalItems} | Topics covered{" "}
          {playlist.uniqueTopicCount}
        </p>
      </div>
    </div>
  );
}

function CardThree({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card/75 p-4 pl-5">
      <div className="absolute inset-y-0 left-0 w-1 bg-foreground/25" />
      <div className="relative">
        <MetaBadges playlist={playlist} />
        <h3 className="mt-3 font-serif text-2xl leading-tight tracking-tight">
          {playlist.title}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium uppercase">
          <span className="rounded-full border border-border/70 px-3 py-1">
            {playlist.totalItems} questions
          </span>
          <span className="rounded-full border border-border/70 px-3 py-1">
            {playlist.uniqueTopicCount} topics
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {playlist.description}
        </p>
      </div>
    </div>
  );
}

function CardFour({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <MetaBadges playlist={playlist} />
        <div className="rounded-md border border-border/70 bg-background/60 px-2 py-1 text-xs font-semibold tracking-wide uppercase">
          {playlist.totalItems} Q
        </div>
      </div>
      <h3 className="font-serif text-2xl leading-tight tracking-tight">
        {playlist.title}
      </h3>
      <div className="mt-3 inline-flex rounded-md border border-border/70 bg-background/60 px-2.5 py-1 text-xs font-semibold tracking-wide uppercase">
        {playlist.uniqueTopicCount} topics covered
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {playlist.description}
      </p>
    </div>
  );
}

function CardFive({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="rounded-xl border border-border/80 bg-[linear-gradient(160deg,oklch(0.995_0.002_95),oklch(0.978_0.005_95))] p-4">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
            Questions
          </p>
          <p className="text-2xl font-semibold tracking-tight">
            {playlist.totalItems}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
            Topics
          </p>
          <p className="text-2xl font-semibold tracking-tight">
            {playlist.uniqueTopicCount}
          </p>
        </div>
      </div>
      <h3 className="font-serif text-2xl leading-tight tracking-tight">
        {playlist.title}
      </h3>
      <div className="mt-2">
        <MetaBadges playlist={playlist} />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {playlist.description}
      </p>
    </div>
  );
}

function CardSix({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
      <p className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {playlist.playlistType} | {playlist.accessLevel}
      </p>
      <h3 className="mt-2 font-serif text-[1.7rem] leading-tight tracking-tight">
        {playlist.title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        {playlist.description}
      </p>
      <p className="mt-4 text-sm font-medium text-foreground/80">
        {playlist.totalItems} questions | {playlist.uniqueTopicCount} topics
      </p>
    </div>
  );
}

function CardSeven({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <MetaBadges playlist={playlist} />
      <h3 className="mt-3 font-serif text-2xl leading-tight tracking-tight">
        {playlist.title}
      </h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-border/70 px-3 py-2">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Questions
          </p>
          <p className="mt-1 text-base font-semibold">{playlist.totalItems}</p>
        </div>
        <div className="rounded-md border border-border/70 px-3 py-2">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Topics covered
          </p>
          <p className="mt-1 text-base font-semibold">
            {playlist.uniqueTopicCount}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {playlist.description}
      </p>
    </div>
  );
}

function CardEight({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="font-serif text-[1.55rem] leading-tight tracking-tight">
          {playlist.title}
        </h3>
        <div className="rounded-md border border-border/70 px-2 py-1 text-xs font-semibold">
          {playlist.totalItems}Q
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium capitalize">
          {playlist.playlistType}
        </span>
        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium capitalize">
          {playlist.accessLevel}
        </span>
        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium">
          {playlist.uniqueTopicCount} topics
        </span>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {playlist.description}
      </p>
    </div>
  );
}

function CardNine({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Playlist
        </p>
        <MetaBadges playlist={playlist} />
      </div>
      <h3 className="font-serif text-2xl leading-tight tracking-tight">
        {playlist.title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {playlist.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="secondary">{playlist.totalItems} questions</Badge>
        <Badge variant="secondary">
          {playlist.uniqueTopicCount} topics covered
        </Badge>
      </div>
    </div>
  );
}

function CardTen({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card/80">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-secondary/40 px-4 py-3">
        <MetaBadges playlist={playlist} />
        <div className="rounded-md border border-border/70 bg-background/70 px-2 py-1 text-xs font-semibold uppercase">
          {playlist.totalItems} Q
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-serif text-2xl leading-tight tracking-tight">
          {playlist.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {playlist.description}
        </p>
        <div className="mt-4 grid grid-cols-2 divide-x divide-border/70 rounded-lg border border-border/70">
          <div className="px-3 py-2">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Questions
            </p>
            <p className="text-sm font-semibold">{playlist.totalItems}</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              Topics
            </p>
            <p className="text-sm font-semibold">{playlist.uniqueTopicCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardEleven({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <h3 className="font-serif text-2xl leading-tight tracking-tight">
        {playlist.title}
      </h3>
      <div className="mt-2">
        <MetaBadges playlist={playlist} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-border/70 bg-background/50 px-3 py-1 text-xs font-semibold uppercase">
          Questions: {playlist.totalItems}
        </span>
        <span className="rounded-full border border-border/70 bg-background/50 px-3 py-1 text-xs font-semibold uppercase">
          Topics: {playlist.uniqueTopicCount}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {playlist.description}
      </p>
    </div>
  );
}

function CardTwelve({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <div className="grid grid-cols-[1fr_auto] gap-4">
        <div>
          <MetaBadges playlist={playlist} />
          <h3 className="mt-2 font-serif text-2xl leading-tight tracking-tight">
            {playlist.title}
          </h3>
        </div>
        <div className="space-y-2">
          <div className="min-w-[84px] rounded-md border border-border/70 bg-background/55 px-2.5 py-1.5 text-right">
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Questions
            </p>
            <p className="text-sm font-semibold">{playlist.totalItems}</p>
          </div>
          <div className="min-w-[84px] rounded-md border border-border/70 bg-background/55 px-2.5 py-1.5 text-right">
            <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
              Topics
            </p>
            <p className="text-sm font-semibold">{playlist.uniqueTopicCount}</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {playlist.description}
      </p>
    </div>
  );
}

function CardThirteen({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card/85 p-4">
      <p className="pointer-events-none absolute -right-2 -top-2 select-none text-6xl font-semibold tracking-tight text-foreground/5">
        {playlist.totalItems}
      </p>
      <div className="relative">
        <MetaBadges playlist={playlist} />
        <h3 className="mt-3 font-serif text-2xl leading-tight tracking-tight">
          {playlist.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {playlist.description}
        </p>
        <div className="mt-4 flex items-center gap-3 text-sm font-medium text-foreground/80">
          <span>{playlist.totalItems} questions</span>
          <span className="text-muted-foreground">/</span>
          <span>{playlist.uniqueTopicCount} topics</span>
        </div>
      </div>
    </div>
  );
}

function CardFourteen({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <div className="rounded-lg border border-border/70 bg-[linear-gradient(140deg,oklch(0.992_0.004_95),oklch(0.973_0.006_95))] p-3">
        <MetaBadges playlist={playlist} />
        <h3 className="mt-2 font-serif text-2xl leading-tight tracking-tight">
          {playlist.title}
        </h3>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-border/70 bg-background/50 px-3 py-2">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Questions
          </p>
          <p className="text-sm font-semibold">{playlist.totalItems}</p>
        </div>
        <div className="rounded-md border border-border/70 bg-background/50 px-3 py-2">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Topics covered
          </p>
          <p className="text-sm font-semibold">{playlist.uniqueTopicCount}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {playlist.description}
      </p>
    </div>
  );
}

function CardFifteen({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="rounded-xl border border-border/75 bg-card/80 p-4">
      <MetaBadges playlist={playlist} />
      <h3 className="mt-3 font-serif text-2xl leading-tight tracking-tight">
        {playlist.title}
      </h3>
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
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {playlist.description}
      </p>
    </div>
  );
}

function CardSixteen({ playlist }: { playlist: DemoPlaylist }) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md border border-border/70 px-2 py-1 text-xs font-medium capitalize">
            {playlist.playlistType}
          </span>
          <span className="rounded-md border border-border/70 px-2 py-1 text-xs font-medium capitalize">
            {playlist.accessLevel}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[11px] tracking-wide text-muted-foreground uppercase">
            Scope
          </p>
          <p className="text-sm font-semibold">
            {playlist.totalItems}Q / {playlist.uniqueTopicCount}T
          </p>
        </div>
      </div>
      <h3 className="font-serif text-[1.65rem] leading-tight tracking-tight">
        {playlist.title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {playlist.description}
      </p>
    </div>
  );
}

const SAMPLES: PlaylistCardSample[] = [
  {
    id: "1",
    name: "Soft Outline Stats",
    summary:
      "Closest to current style with stat tiles and restrained contrast.",
    group: "Theme-aligned",
    renderCard: (playlist) => <CardOne playlist={playlist} />,
  },
  {
    id: "2",
    name: "Divider Metrics Row",
    summary: "Content-first body with a clean metric line at the bottom.",
    group: "Theme-aligned",
    renderCard: (playlist) => <CardTwo playlist={playlist} />,
  },
  {
    id: "3",
    name: "Accent Rail Tags",
    summary: "Adds a left accent and compact metric pills for quick scanning.",
    group: "Theme-aligned",
    renderCard: (playlist) => <CardThree playlist={playlist} />,
  },
  {
    id: "4",
    name: "Header Utility Labels",
    summary: "Metadata sits in the header with minimal visual weight.",
    group: "Theme-aligned",
    renderCard: (playlist) => <CardFour playlist={playlist} />,
  },
  {
    id: "5",
    name: "Stat-First Hero",
    summary: "Lead with quantitative metrics before title and description.",
    group: "Exploratory",
    renderCard: (playlist) => <CardFive playlist={playlist} />,
  },
  {
    id: "6",
    name: "Editorial Minimal",
    summary: "Low-chrome typography-driven card with a compact metric line.",
    group: "Exploratory",
    renderCard: (playlist) => <CardSix playlist={playlist} />,
  },
  {
    id: "7",
    name: "Split Metric Panels",
    summary:
      "Balanced layout with equal-weight stat blocks before description.",
    group: "Exploratory",
    renderCard: (playlist) => <CardSeven playlist={playlist} />,
  },
  {
    id: "8",
    name: "Dense Product Tile",
    summary:
      "Compact top row and metadata chips for denser information display.",
    group: "Exploratory",
    renderCard: (playlist) => <CardEight playlist={playlist} />,
  },
  {
    id: "9",
    name: "Label + Dual Chips",
    summary: "Simple label-led header with compact metric chips in the footer.",
    group: "Theme-aligned",
    renderCard: (playlist) => <CardNine playlist={playlist} />,
  },
  {
    id: "10",
    name: "Framed Header Strip",
    summary: "Header band for metadata and a structured split metrics panel.",
    group: "Theme-aligned",
    renderCard: (playlist) => <CardTen playlist={playlist} />,
  },
  {
    id: "11",
    name: "Round Metric Pills",
    summary: "Title-first card using rounded stat pills for quick recognition.",
    group: "Theme-aligned",
    renderCard: (playlist) => <CardEleven playlist={playlist} />,
  },
  {
    id: "12",
    name: "Right Docked Stats",
    summary: "Two docked stat tiles anchored to the right of heading content.",
    group: "Theme-aligned",
    renderCard: (playlist) => <CardTwelve playlist={playlist} />,
  },
  {
    id: "13",
    name: "Ghost Numeral Backdrop",
    summary: "Large background numeral adds hierarchy without extra data.",
    group: "Exploratory",
    renderCard: (playlist) => <CardThirteen playlist={playlist} />,
  },
  {
    id: "14",
    name: "Panel + Stat Grid",
    summary: "Soft framed hero panel followed by compact stat boxes.",
    group: "Exploratory",
    renderCard: (playlist) => <CardFourteen playlist={playlist} />,
  },
  {
    id: "15",
    name: "List Metrics",
    summary:
      "Uses definition-list rows to present questions and topics cleanly.",
    group: "Exploratory",
    renderCard: (playlist) => <CardFifteen playlist={playlist} />,
  },
  {
    id: "16",
    name: "Scope Badge Header",
    summary: "Badge-like metadata with compact scope text for dense layouts.",
    group: "Exploratory",
    renderCard: (playlist) => <CardSixteen playlist={playlist} />,
  },
];

function PlaylistCardPreview({ sample }: { sample: PlaylistCardSample }) {
  return (
    <article className="rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm">
      <div className="mb-3">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {sample.group}
          </p>
          <span className="text-xs text-muted-foreground">#{sample.id}</span>
        </div>
        <h2 className="font-serif text-xl tracking-tight">{sample.name}</h2>
        <p className="text-sm text-muted-foreground">{sample.summary}</p>
      </div>
      {sample.renderCard(DEMO_PLAYLIST)}
    </article>
  );
}

export default function PlaylistCardDesignSamplesPage() {
  return (
    <main className="min-h-screen bg-[oklch(0.985_0.004_95)]">
      <section className="mx-auto w-full max-w-7xl space-y-6 px-6 py-10 md:px-10 md:py-12">
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Design Samples
          </p>
          <h1 className="font-serif text-4xl tracking-tight">
            Playlist Card Variants
          </h1>
          <p className="max-w-4xl text-sm text-muted-foreground">
            Using only current card fields: type, access, title, questions,
            topics covered, and description. Reply with sample number(s) and I
            will apply your selected design to featured playlist cards.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          {SAMPLES.map((sample) => (
            <PlaylistCardPreview key={sample.id} sample={sample} />
          ))}
        </div>
      </section>
    </main>
  );
}
