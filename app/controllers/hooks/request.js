// response events


export const start = () => {
  return {
    cache: {
      request: {
        lifespan: 'application'
      }
    }
  }
}
