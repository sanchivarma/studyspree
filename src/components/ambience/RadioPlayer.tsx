"use client";

export function RadioPlayer({ name, src }: { name: string; src: string }) {
  // The official player hides its volume slider below a 640px iframe viewport.
  // Keep that viewport and align its control group to the panel's right edge.
  // The selected station's name is already shown outside the embedded player.
  return <div className="relative mt-3 h-[100px] w-full overflow-hidden rounded-xl" data-testid="radio-player">
    <iframe title={name} src={src} width={640} height={100} allow="autoplay" referrerPolicy="no-referrer"
      className="absolute top-0 right-0 h-[100px] w-[640px] min-w-full border-0" />
  </div>;
}
