// portfolio controller


// default action
export const handler = (params) => {
  return {
    include: {
      screens: {
        controller: '_screens'
      }
    }
  }
}
