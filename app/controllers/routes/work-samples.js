// work samples controller


// default action
export const handler = () => {
  return {
    include: {
      screens: {
        controller: '_screens'
      }
    }
  }
}
