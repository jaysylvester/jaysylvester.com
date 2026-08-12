// resume controller


// default action
export const handler = async () => {
  const employers = await app.models.resume.employers()

  return {
    local: {
      employers: employers
    }
  }
}
