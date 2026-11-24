import { Info } from 'lucide-react'

export const ANALYSIS_DISABLED_TITLE = 'Image analysis is switched off on this server'

/** Shown wherever classifiers can be toggled when the server runs on stored
 * analysis results (the demo), so a switch that cannot take effect is explained. */
export function AnalysisDisabledNotice() {
  return (
    <div
      className="flex gap-3 rounded-md bg-neutral-700/40 p-3 text-sm text-neutral-300"
      data-testid="analysis-disabled-notice"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-medium text-white">{ANALYSIS_DISABLED_TITLE}</p>
        <p>
          New photos won't be tagged for colour, objects, faces, places or style. The
          tags you can see were generated in advance and loaded from stored results.
        </p>
        <p className="text-xs text-neutral-400">
          To turn analysis on, restart Photonix without CLASSIFICATION_DISABLED=1.
        </p>
      </div>
    </div>
  )
}
