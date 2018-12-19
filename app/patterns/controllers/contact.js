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
    content: {
      verification: verification()
    },
    cache: {
      route: false
    }
  }
}


function form(params) {
  let emailRegex = new RegExp(/[a-z0-9!##$%&''*+/=?^_`{|}~-]+(?:\.[a-z0-9!##$%&''*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/i)

  if ( params.request.method !== 'POST' ) {
    return { redirect: '/contact' }
  } else {
    if ( !params.form.name.length || !params.form.email.length || !params.form.subject.length || !params.form.message.length ) {
      return {
        content: {
          error: 'All fields are required.',
          verification: verification()
        },
        cache: {
          route: false
        }
      }
    } else if ( !emailRegex.test(params.form.email) ) {
      return {
        content: {
          error: 'Your e-mail address doesn\'t look right.',
          verification: verification()
        },
        cache: {
          route: false
        }
      }
    } else if ( parseInt(params.form.first_int, 10) + parseInt(params.form.second_int, 10) !== parseInt(params.form.verification, 10) ) {
      return {
        content: {
          error: 'Are you a bot? If not, please try again.',
          verification: verification()
        },
        cache: {
          route: false
        }
      }
    } else {
      app.toolbox.mail.sendMail({
        from: { name: params.form.name, address: params.form.email },
        to: { name: 'Jay Sylvester', address: 'jay@jaysylvester.com' },
        cc: params.form.cc ? { name: params.form.name, address: params.form.email } : {},
        subject: params.form.subject + ' (sent via contact form)',
        text: params.form.message
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


function verification() {
  let verification = {}
  verification.firstInt  = app.toolbox.helpers.getRandomIntInclusive(1, 10)
  verification.secondInt = app.toolbox.helpers.getRandomIntInclusive(1, 10)
  verification.answer    = verification.firstInt + verification.secondInt
  verification.options   = []
  for ( var i = 0; i < 5; i++ ) {
    verification.options[app.toolbox.helpers.getRandomIntInclusive(0, 20)] = app.toolbox.helpers.getRandomIntInclusive(1, 20)
  }
  verification.options[app.toolbox.helpers.getRandomIntInclusive(0, 20)] = verification.answer
  verification.options = verification.options.filter( function (element) {
    return element != null
  })
  verification.options = verification.options.filter( function (item, index, array) {
    return array.indexOf(item) === index
  })
  verification.options.sort((a, b) => a - b)
  return verification
}
