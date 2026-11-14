import { useEffect, useRef, useState, type AnimationEvent } from "react";
import type { Mood, QueuedOneShot } from "../../domain/types";
import { ONE_SHOT_GRACE_MS, ONE_SHOT_MS } from "./oneShotTiming";

/**
 * Which mood to draw. While a one-shot plays, a mood change must wait: the pet keeps the mood it
 * had when the animation started and takes the new one when the animation ends (PLAN.md section 6).
 */
export function moodToShow(playing: boolean, heldMood: Mood, targetMood: Mood): Mood {
  return playing ? heldMood : targetMood;
}

/**
 * Should this animationend event count as "the one-shot finished"? The event bubbles from every
 * animation in the subtree and fires for loops too, so only the shot wrapper's own animation, once
 * per queued shot, counts.
 */
export function shouldReportEnd(input: {
  animationName: string;
  isOwnTarget: boolean;
  oneShotId: number;
  reportedId: number | null;
}): boolean {
  return (
    input.isOwnTarget &&
    input.animationName.startsWith("pet-shot-") &&
    input.reportedId !== input.oneShotId
  );
}

interface MachineInput {
  mood: Mood;
  oneShot: QueuedOneShot | null;
  onOneShotDone: (id: number) => void;
}

/**
 * The UI-only state machine of the character: a looping base state chosen by the mood, and
 * one-shots that interrupt it. It owns no game state; the store owns the queue.
 */
export function useCharacterMachine({ mood, oneShot, onOneShotDone }: MachineInput) {
  const playing = oneShot !== null;

  // "Adjusting state while rendering": heldMood follows the mood whenever nothing is playing,
  // so while a one-shot plays it still holds the mood from before the animation started.
  const [heldMood, setHeldMood] = useState<Mood>(mood);
  if (!playing && heldMood !== mood) setHeldMood(mood);

  const reportedId = useRef<number | null>(null);
  const report = (id: number) => {
    if (reportedId.current === id) return;
    reportedId.current = id;
    onOneShotDone(id);
  };

  // Safety net: if the browser never fires animationend (window hidden), the queue must not stall.
  const shotId = oneShot?.id;
  const shotKind = oneShot?.kind;
  useEffect(() => {
    if (shotId === undefined || shotKind === undefined) return;
    const timer = window.setTimeout(() => report(shotId), ONE_SHOT_MS[shotKind] + ONE_SHOT_GRACE_MS);
    return () => window.clearTimeout(timer);
    // report only reads a ref and the store action (which never changes), so it is left out of the deps.
  }, [shotId, shotKind]);

  const handleAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (oneShot === null) return;
    const verdict = shouldReportEnd({
      animationName: event.animationName,
      isOwnTarget: event.target === event.currentTarget,
      oneShotId: oneShot.id,
      reportedId: reportedId.current,
    });
    if (verdict) report(oneShot.id);
  };

  return { shownMood: moodToShow(playing, heldMood, mood), handleAnimationEnd };
}
