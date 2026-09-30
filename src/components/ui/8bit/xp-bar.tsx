import { type BitProgressProps, Progress } from "@/components/ui/8bit/progress";
import { cn } from "@/lib/utils";

interface XpBarProps extends React.ComponentProps<"div"> {
  className?: string;
  props?: BitProgressProps;
  variant?: "retro" | "default";
  value?: number;
  levelUpMessage?: string;
}

export default function XpBar({
  className,
  variant,
  value,
  levelUpMessage = "LEVEL UP!",
  ...props
}: XpBarProps) {
  const isLevelUp = value === 100;

  return (
    <div className={cn("relative", className)}>
      <Progress
        {...props}
        value={value}
        variant={variant}
        className={cn(isLevelUp && "animate-pulse", "h-4")}
        progressBg="bg-(--color-xp)"
      />
      {isLevelUp && (
        <div
          className={cn(
            "retro",
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "text-[0.625rem] text-(--color-xp-text)",
            "pointer-events-none whitespace-nowrap z-10",
                        "animate-[cursor-blink_1.1s_steps(1)_infinite]"
          )}
        >
          {levelUpMessage}
        </div>
      )}
    </div>
  );
}

