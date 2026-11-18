let resolve: () => void
/** Resolves after the hero scene renders its first frame (stands in for the hero GLB until phase 3). */
export const sceneReady = new Promise<void>((r) => (resolve = r))
export const markSceneReady = () => resolve()
