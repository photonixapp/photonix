export const updateConfig = (config) => {
  console.log(config)
  return {
    type: 'UPDATE_CONFIG',
    progress: Math.random(),
    config: config,
  }
}

export const updateTimeline = (photos) => {
  return {
    type: 'UPDATE_TIMELINE',
    photos: photos,
  }
}
