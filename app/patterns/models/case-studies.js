// _case-study model

'use strict'

module.exports = {
  caseStudies : caseStudies,
  caseStudy   : caseStudy
}


async function caseStudies(count = false) {
  const client = await app.toolbox.dbPool.connect()

  try {
    const result = await client.query({
      name: count ? 'case_studies_caseStudies_count_' + count : 'case_studies_caseStudies',
      text: 'select id, company_name, company_url, title, tagline, vertical, platform, expertise, summary, sort from case_studies order by sort asc' + ( count ? ' limit ' + count : '' ) + ';'
    })
    return result.rows
  } finally {
    client.release()
  }
}


async function caseStudy(companyUrl) {
  const client = await app.toolbox.dbPool.connect()

  try {
    const result = await client.query({
      name: 'case_studies_caseStudy',
      text: 'select id, company_name, company_url, title, tagline, vertical, platform, expertise, summary, content from case_studies where company_url = $1;',
      values: [ companyUrl ]
    })
    return result.rows[0]
  } finally {
    client.release()
  }
}
