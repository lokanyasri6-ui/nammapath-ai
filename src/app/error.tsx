"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Something went wrong · ஏதோ தவறு நடந்தது</h1>
      <p className="mt-3 text-navy-700">This part of the app hit an unexpected error. Your reports are safe.</p>
      <button type="button" onClick={reset} className="btn-primary mt-6">Try again · மீண்டும் முயற்சி</button>
    </div>
  );
}
