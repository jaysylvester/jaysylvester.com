// resume controller


// default action
export const handler = async (params) => {
  return {
    local: {
      employers: await app.models.resume.employers()
    }
  }
}
