// +_layout controller


// default action
export const handler = ({ route }) => {
  return {
    include: {
      head: '/_head/controller/' + route.controller,
      header: '/_header',
      footer: '/_footer'
    }
  }
}
