// +_layout controller


// default action
export const handler = () => {
  return {
    include: {
      head: {
        controller: '_head'
      },
      header: {
        controller: '_header'
      },
      footer: {
        controller: '_footer'
      }
    }
  }
}
