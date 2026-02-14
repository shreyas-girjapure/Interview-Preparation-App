import { cn } from "@/lib/utils";

type BrandCatLogoProps = {
  className?: string;
};

export function BrandCatLogo({ className }: BrandCatLogoProps) {
  return (
    <svg
      viewBox="0 0 140 120"
      fill="none"
      aria-hidden="true"
      className={cn("brand-cat-logo", className)}
    >
      <g className="brand-cat-logo__book">
        <path
          className="brand-cat-logo__book-cover"
          d="M24 74c14-7 29-10 46-10c17 0 32 3 46 10v28c-14-7-29-10-46-10c-17 0-32 3-46 10V74Z"
        />
        <path
          className="brand-cat-logo__book-page brand-cat-logo__book-page--left"
          d="M30 78c12-4 24-6 36-6v23c-12 0-24 2-36 6V78Z"
        />
        <path
          className="brand-cat-logo__book-page brand-cat-logo__book-page--right"
          d="M74 72c12 0 24 2 36 6v23c-12-4-24-6-36-6V72Z"
        />
        <path
          className="brand-cat-logo__book-page-turn"
          d="M74 72c12 0 24 2 36 6v23c-12-4-24-6-36-6V72Z"
        />
        <path className="brand-cat-logo__book-spine" d="M70 72v24" />
      </g>

      <g className="brand-cat-logo__cat">
        <path
          className="brand-cat-logo__cat-tail"
          d="M100 69c10 0 16 8 16 16c0 4-2 8-6 8c-4 0-6-3-6-6c0-3 1-5 1-7c0-4-2-7-5-9"
        />
        <ellipse
          className="brand-cat-logo__cat-body"
          cx="70"
          cy="66"
          rx="33"
          ry="24"
        />
        <circle className="brand-cat-logo__cat-head" cx="70" cy="42" r="21" />
        <path className="brand-cat-logo__cat-ear" d="M54 30l8-14l8 14Z" />
        <path className="brand-cat-logo__cat-ear" d="M70 30l8-14l8 14Z" />
        <circle
          className="brand-cat-logo__cat-ear-inner"
          cx="62"
          cy="24"
          r="3.2"
        />
        <circle
          className="brand-cat-logo__cat-ear-inner"
          cx="78"
          cy="24"
          r="3.2"
        />

        <g className="brand-cat-logo__cat-eyes">
          <path d="M61 43h6" />
          <path d="M73 43h6" />
        </g>

        <path className="brand-cat-logo__cat-nose" d="M68 48l2 2l2-2" />
        <path
          className="brand-cat-logo__cat-mouth"
          d="M67 52c1.6 2 4.4 2 6 0"
        />
        <path
          className="brand-cat-logo__cat-whiskers"
          d="M56 49l-8-2M56 53l-8 2"
        />
        <path
          className="brand-cat-logo__cat-whiskers"
          d="M84 49l8-2M84 53l8 2"
        />
        <ellipse
          className="brand-cat-logo__cat-paw"
          cx="58"
          cy="76"
          rx="8"
          ry="6.5"
        />
        <ellipse
          className="brand-cat-logo__cat-paw"
          cx="82"
          cy="76"
          rx="8"
          ry="6.5"
        />
      </g>
    </svg>
  );
}
