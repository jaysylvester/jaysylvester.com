// resume model


export const employers = async () => {
  const client = await app.toolbox.dbPool.connect()

  try {
    const result = await client.query({
      name: 'work_history_employers',
      text: 'select w.id, w.employer_name, w.employer_url, w.job_title, w.job_description, w.employed_from, w.employed_to, c.company_url, c.title from work_history w left join case_studies c on w.employer_url = c.company_url order by employed_to desc;'
    })
    // Format dates
    result.rows.forEach( function (item) {
      item.employed_from_formatted = app.toolbox.moment(item.employed_from).format('MMMM YYYY')
      if ( item.employed_to ) {
        item.employed_to_formatted = app.toolbox.moment(item.employed_to).format('MMMM YYYY')
      }
    })
    return result.rows
  } finally {
    client.release()
  }
}
