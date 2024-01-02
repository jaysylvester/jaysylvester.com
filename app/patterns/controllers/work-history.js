// work-history controller


// default action
export const handler = async (params) => {
  return {
    public: {
      employers: await app.models['work-history'].employers()
    }
  }
}
