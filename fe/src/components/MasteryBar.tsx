type Props = { topic: string; score: number };

export function MasteryBar({ topic, score }: Props) {
  const pct = Math.round(score * 100);
  const tone = pct >= 70 ? "from-accent to-cyan-300" : pct >= 40 ? "from-accent-2 to-violet-300" : "from-rose-400 to-orange-300";
  return (
    <div className="rounded-xl border border-border/70 bg-card/50 p-3 transition-colors hover:border-accent/30">
      <div className="mb-2 flex justify-between text-sm">
        <span className="capitalize">{topic}</span>
        <span className="font-mono text-accent">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border/80">
        <div className={`h-full rounded-full bg-linear-to-r ${tone} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
