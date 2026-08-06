// resume controller


// default action
export const handler = async () => {
  return {
    local: {
      employers: await app.models.resume.employers()
    }
  }
}
