interface Props {
  name: string;
  logo: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

export default function PlatformCard({ name, logo, description, selected, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-2 flex-1 rounded-xl border p-4 text-left transition-all ${
        selected
          ? "border-violet-600 bg-violet-50 ring-1 ring-violet-600"
          : "border-border hover:border-violet-300 hover:bg-muted/40"
      }`}
    >
      <span className="text-2xl">{logo}</span>
      <span className="text-sm font-medium text-foreground">{name}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}
