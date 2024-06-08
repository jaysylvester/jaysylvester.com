// response events


export const start = () => {
  return {
    cache: {
      route: {
        lifespan: 'application'
      }
    }
  }
}
