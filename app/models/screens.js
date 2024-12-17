// _screens model


export const companyScreens = async (company, featured) => {
  const client = await app.toolbox.dbPool.connect()

  try {
    let result
    if ( featured ) {
      result = await client.query({
        name: 'case_study_screens_featured',
        text: 'select id, company, url, alt, category, sort from screens where company = $1 and featured = true order by sort asc;',
        values: [ company ]
      })
    } else {
      result = await client.query({
        name: 'case_study_screens',
        text: 'select id, company, url, alt, category, sort from screens where company = $1 order by sort asc;',
        values: [ company ]
      })
    }
    // Transform the data to make it usable by the view
    let screens = {}
    result.rows.forEach( function (screen) {
      if ( !screens[screen.category] ) {
        screens[screen.category] = {
          company: screen.company,
          category: screen.category,
          screens: {}
        }
      }
      screens[screen.category].screens[screen.sort] = {
        company:  screen.company,
        url:      screen.url,
        alt:      screen.alt,
        sort:     screen.sort,
        category: screen.category
      }
    })
    return screens
  } finally {
    client.release()
  }
}


export const featuredScreens = async () => {
  const client = await app.toolbox.dbPool.connect()

  try {
    const result = await client.query({
      name: 'featured_screens',
      text: 'select id, company, url, alt, category, sort from screens where featured = true order by sort asc;'
    })
    return result.rows
  } finally {
    client.release()
  }
}


export const screens = async () => {
  const client = await app.toolbox.dbPool.connect()

  try {
    const result = await client.query({
      name: 'work_samples_screens',
      text: 'select s.id, s.company, s.url, s.alt, s.category, s.sort, cs.company_url from screens s left join case_studies cs on s.company = cs.company_url order by sort asc;'
    })
    // Transform the data to make it usable by the view
    let screens = {}
    result.rows.forEach( function (screen) {
      if ( !screens[screen.category] ) {
        screens[screen.category] = {
          company: screen.company,
          category: screen.category,
          case_study: screen.company_url,
          screens: {}
        }
      }
      screens[screen.category].screens[screen.sort] = {
        company:  screen.company,
        url:      screen.url,
        alt:      screen.alt,
        sort:     screen.sort,
        category: screen.category
      }
    })
    return screens
  } finally {
    client.release()
  }
}
