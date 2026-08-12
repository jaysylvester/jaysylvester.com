// Gallery controller


export const handler = async () => {
  return {
    local: {
      screenGroups: await app.models.screens.screens()
    }
  }
}
