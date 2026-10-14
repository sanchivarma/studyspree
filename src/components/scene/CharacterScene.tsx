"use client";

import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { SceneVideo, type SceneVideoProps } from "./SceneVideo";

/** Scene changes are visual; this component never reads or writes a session. */
export function CharacterScene(props: SceneVideoProps) {
  const reducedMotion = useReducedMotion();
  const visible = usePageVisibility();
  return <div data-testid="character-scene" className="pointer-events-none absolute inset-0 overflow-hidden">
    <AnimatePresence initial={false}>
      <motion.div key={props.slug} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion || !visible ? 0 : 0.4 }}>
        <SceneLayer {...props} />
      </motion.div>
    </AnimatePresence>
  </div>;
}

function SceneLayer(props: SceneVideoProps) {
  const present = useIsPresent();
  // The outgoing layer keeps its poster/gradient while its video is released.
  return <SceneVideo {...props} posterOnly={props.posterOnly || !present} />;
}
