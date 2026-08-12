// _header controller


// default action
export const handler = ({ url }) => {
  return {
    local: {
      currentController: url.controller === 'case-study' ? 'case-studies' : url.controller
    }
  }
}
