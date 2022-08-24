// contact controller

'use strict'

module.exports = {
  handler       : handler,
  form          : form,
  confirmation  : confirmation
}


// default action
function handler() {
  return {
    cache: {
      route: false
    }
  }
}


function form(params, request) {
  let emailRegex = new RegExp(/[a-z0-9!##$%&''*+/=?^_`{|}~-]+(?:\.[a-z0-9!##$%&''*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/i)

  if ( request.method !== 'POST' ) {
    return { redirect: '/contact' }
  } else {
    if ( !params.form.name.length || !params.form.email.length || !params.form.subject.length || !params.form.message.length ) {
      return {
        public: {
          error: 'All fields are required'
        },
        cache: {
          route: false
        }
      }
    } else if ( !emailRegex.test(params.form.email) ) {
      return {
        public: {
          error: 'Your e-mail address doesn\'t look right'
        },
        cache: {
          route: false
        }
      }
    } else if ( params.form.nope.length ) {
      return {
        public: {
          error: 'Are you a bot? If not, please try again.'
        },
        cache: {
          route: false
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


function confirmation() {
  return { view: 'confirmation' }
}
