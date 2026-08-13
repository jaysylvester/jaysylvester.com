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


export const companyScreens = async (company) => {
  const client = await app.toolbox.dbPool.connect()

  try {
    const result = await client.query({
      name: 'case_study_screens_v2',
      text: 'select s.id, s.company, s.url, s.alt, s.category, s.sort, cs.company_url ' +
            'from screens s ' +
            'left join case_studies cs on s.company = cs.company_url ' +
            'where s.company = $1 ' +
            'order by s.sort asc;',
      values: [ company ]
    })

    return groupScreens(result.rows)
  } finally {
    client.release()
  }
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
