import { Sprite } from '@/art/Sprite';
import { STAGE_FRAMES } from '@/art/sprites';
import { useStage } from './usePath';

/** The learner's character at whatever stage of the career path they have reached. */
export function Character({ size, label }: { size: number; label: string }) {
  return <Sprite frames={STAGE_FRAMES[useStage()]} size={size} label={label} />;
}
