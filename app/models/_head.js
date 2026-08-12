// _head model


export const caseStudies = () => {
  return {
    title:        'Jay Sylvester — Case Studies',
    description:  'Read detailed case studies that describe my contribution to various UX and development projects.',
    keywords:     'UI, UX, user experience, product design, front end development, case studies'
  }
}


export const caseStudy = async (company) => {
  let caseStudy = await app.models['case-studies'].caseStudy(company)

  if ( caseStudy ) {
    return {
      title:        'Jay Sylvester — Case Study: ' + caseStudy.title,
      description:  caseStudy.summary,
      keywords:     'UI, UX, user experience, product design, UX case study, ' + caseStudy.company_name + ' case study'
    }
  } else {
    return false
  }
}


export const contact = () => {
  return {
    title:        'Jay Sylvester — Contact Me',
    description:  'Find me on social media or send me an e-mail.',
    keywords:     'jay sylvester, e-mail, contact form, social media'
  }
}


export const citizen = () => {
  return {
    title:       'citizen — A Node.js MVC Web Application Framework',
    description: 'Learn about citizen, the open source Node.js MVC web application framework that powers this site.',
    keywords:    'citizen, Node.js, MVC, web application framework, open source'
  }
}


export const gallery = () => {
  return {
    title:       'Jay Sylvester — Gallery',
    description: 'Browse audits, specifications, wireframes, process artifacts, mockups, and prototypes from twenty years of product work.',
    keywords:    'UI, UX, product design gallery, wireframes, prototypes, process artifacts'
  }
}


export const error = () => {
  return {
    title:        'Oops...',
    description:  'This request threw an error.',
    keywords:     ''
  }
}


export const index = () => {
  return {
    title:       'Jay Sylvester — UX Manager/Director, Product Designer, and Engineer',
    description: 'I\'m a design director/lead with over 20 years of experience spanning user research, user experience design, and full stack development.',
    keywords:    'UX, UI, user experience, ux manager, ux lead, ux director, ux researcher, ux consultant'
  }
}


export const resume = () => {
  return {
    title:       'Jay Sylvester — Résumé / Work History',
    description: 'I\'ve led and contributed to just about every phase of the development lifecycle, including team management, information architecture, UX design, and full stack development.',
    keywords:    'UI, UX, ux designer resume, ux designer cv, ux manager, ux director, product designer, front end developer, ui engineer'
  }
}
