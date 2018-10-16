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
  if ( params.request.method !== 'POST' ) {
    handler(params, context, emitter)
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