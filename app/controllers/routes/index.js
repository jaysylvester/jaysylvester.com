// index controller


// default action
export const handler = async () => {
  const caseStudies = await app.models['case-studies'].caseStudies(),
        employers = await app.models.resume.employers(),
        caseStudiesByCompany = new Map(caseStudies.map((caseStudy) => [ caseStudy.company_url, caseStudy ])),
        engagements = employers
          .filter((employer) => caseStudiesByCompany.has(employer.company_url))
          .map((employer) => ({
            ...caseStudiesByCompany.get(employer.company_url),
            ...employer,
            domain: employer.vertical || '—'
          }))

  return {
    local: {
      featuredEngagements: engagements.slice(0, 2),
      remainingEngagements: engagements.slice(2)
    }
  }
}
