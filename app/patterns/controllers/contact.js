// contact controller

'use strict'

module.exports = {
  handler: handler,
  form: form
}


// default action
function handler(params, context, emitter) {
  emitter.emit('ready', {
    include: {
      header: {
        controller: '_header'
      },
      footer: {
        controller: '_footer'
      }
    }
  })
}

function form(params, context, emitter) {
  let emailRegex = new RegExp(/[a-z0-9!##$%&''*+/=?^_`{|}~-]+(?:\.[a-z0-9!##$%&''*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/i)

  if ( params.request.method !== 'POST' ) {
    emitter.emit('ready', { redirect: '/contact' })
  } else {
    if ( !params.form.name.length || !params.form.email.length || !params.form.subject.length || !params.form.message.length ) {
      emitter.emit('ready', {
        content: {
          error: 'All fields are required.'
        },
        cache: {
          route: false
        },
        include: {
          header: {
            controller: '_header'
          },
          footer: {
            controller: '_footer'
          }
        }
      })
    } else if ( !emailRegex.test(params.form.email) ) {
      emitter.emit('ready', {
        content: {
          error: 'Your e-mail address doesn\'t look right.'
        },
        cache: {
          route: false
        },
        include: {
          header: {
            controller: '_header'
          },
          footer: {
            controller: '_footer'
          }
        }
      })
    } else {
      app.toolbox.mail.sendMail({
        from: { name: params.form.name, address: params.form.email },
        to: { name: 'Jay Sylvester', address: 'jay@jaysylvester.com' },
        cc: params.form.cc ? { name: params.form.name, address: params.form.email } : {},
        subject: params.form.subject + ' (sent via contact form)',
        text: params.form.message
      })
  
      emitter.emit('ready', {
        view: 'confirmation',
        cache: {
          route: false
        },
        include: {
          header: {
            controller: '_header'
          },
          footer: {
            controller: '_footer'
          }
        }
      })
    }
  }
}
