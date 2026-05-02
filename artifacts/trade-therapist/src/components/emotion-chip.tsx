import { cn } from "@/lib/utils";

type EmotionChipProps = {
  emotion: string;
  className?: string;
};

export const emotionColors: Record<string, string> = {
  calm: "#3b82f6",
  fomo: "#f97316",
  fear: "#8b5cf6",
  greed: "#eab308",
  revenge: "#ef4444",
  hope: "#ec4899",
  frustration: "#f43f5e",
  confidence: "#10b981",
};

export function EmotionChip({ emotion, className }: EmotionChipProps) {
  const color = emotionColors[emotion.toLowerCase()] || "#64748b";
  
  return (
    <div 
      className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border border-transparent shadow-sm transition-colors hover:brightness-110", className)}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderColor: `${color}40`,
      }}
    >
      {emotion}
    </div>
  );
}
