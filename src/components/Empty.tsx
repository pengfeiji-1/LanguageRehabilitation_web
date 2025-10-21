import { showInfo } from "@/lib/toast";
import { cn } from "@/lib/utils";

// Empty component
export function Empty() {
  return (
    <div className={cn("flex h-full items-center justify-center")} onClick={() => showInfo('Coming soon')}>Empty</div>
  );
}