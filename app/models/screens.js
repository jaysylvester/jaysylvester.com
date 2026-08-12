// screens model


const groupScreens = (rows) => {
  const groups = []
  const byCategory = new Map()

  rows.forEach((screen) => {
    if ( !byCategory.has(screen.category) ) {
      const group = {
        company:    screen.company,
        category:   screen.category,
        case_study: screen.company_url,
        screens:    []
      }

      byCategory.set(screen.category, group)
      groups.push(group)
    }

    byCategory.get(screen.category).screens.push({
      id:       screen.id,
      company:  screen.company,
      url:      screen.url,
      alt:      screen.alt,
      sort:     screen.sort,
      category: screen.category
    })
  })

  return groups
}


export const companyScreens = async (company, featured = false) => {
  const client = await app.toolbox.dbPool.connect()

  try {
    const result = await client.query({
      name: featured ? 'case_study_screens_featured_v2' : 'case_study_screens_v2',
      text: 'select s.id, s.company, s.url, s.alt, s.category, s.sort, cs.company_url ' +
            'from screens s ' +
            'left join case_studies cs on s.company = cs.company_url ' +
            'where s.company = $1' + ( featured ? ' and s.featured = true' : '' ) + ' ' +
            'order by s.sort asc;',
      values: [ company ]
    })

    return groupScreens(result.rows)
  } finally {
    client.release()
  }
}


export const featuredScreens = async (company) => {
  const groups = await companyScreens(company, true)

  return groups.flatMap((group) => group.screens).slice(0, 2)
}


export const screens = async () => {
  const client = await app.toolbox.dbPool.connect()

  try {
    const result = await client.query({
      name: 'gallery_screens_v2',
      text: 'select s.id, s.company, s.url, s.alt, s.category, s.sort, cs.company_url ' +
            'from screens s ' +
            'left join case_studies cs on s.company = cs.company_url ' +
            'order by s.sort asc;'
    })

    return groupScreens(result.rows)
  } finally {
    client.release()
  }
}
