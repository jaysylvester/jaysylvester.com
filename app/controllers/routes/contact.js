// contact controller


// default action
export const handler = () => {
  return {
    local: {
      date: Date.now()
    },
    cache: {
      request: false
    }
  }
}


export const form = (params, request) => {
  let emailRegex = new RegExp(/[a-z0-9!##$%&''*+/=?^_`{|}~-]+(?:\.[a-z0-9!##$%&''*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/i)

  if ( request.method !== 'POST' ) {
    return { redirect: '/contact' }
  } else {
    if ( !params.form.name.length || !params.form.email.length || !params.form.subject.length || !params.form.message.length ) {
      return {
        local: {
          date: Date.now(),
          error: 'All fields are required'
        },
        cache: {
          request: false
        }
      }
    } else if ( !emailRegex.test(params.form.email) ) {
      return {
        local: {
          date: Date.now(),
          error: 'Your e-mail address doesn\'t look right'
        },
        cache: {
          request: false
        }
      }
    // If they submit the form in less than 10 seconds, assume it's a bot.
    } else if ( params.form.date > ( Date.now() - 10000 ) ) {
      return {
        local: {
          date: Date.now(),
          error: 'Are you a bot? If not, wait 10 seconds and try again.'
        },
        cache: {
          request: false
        }
      }
    } else {
      app.toolbox.mail.sendMail({
        to: { name: app.config.mail.name, address: app.config.mail.address },
        from: { name: params.form.name, address: params.form.email },
        subject: params.form.subject + ' (sent via contact form)',
        text: params.form.message
      })

      app.toolbox.mail.sendMail({
        to: { name: params.form.name, address: params.form.email },
        from: { name: app.config.mail.name, address: app.config.mail.addressNoReply },
        subject: 'Message confirmation',
        text: 'Thanks for your message. I\'ll respond to you shortly.\n\nPlease don\'t reply to this e-mail; this address is unmonitored.'
      })
  
      return {
        redirect: '/contact/action/confirmation'
      }
    }
  }
}


export const confirmation = () => {
  return { view: 'confirmation' }
}
