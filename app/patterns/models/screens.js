// _screens model


export const companyScreens = async (company) => {
  const client = await app.toolbox.dbPool.connect()

  try {
    const result = await client.query({
      name: 'case_study_screens',
      text: 'select id, company, url, alt, category, sort from screens where company = $1 order by sort asc;',
      values: [ company ]
    })
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
      name: 'portfolio_screens',
      text: 'select id, company, url, alt, category, sort from screens order by sort asc;'
    })
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
