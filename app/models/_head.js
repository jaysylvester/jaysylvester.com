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


export const workSamples = () => {
  return {
    title:       'Jay Sylvester\'s Portfolio — UX Manager/Director, Product Designer, and Engineer',
    description: 'Enjoy my dry process documentation, research data, ugly sketches, plain-looking wireframes, and half-baked prototypes. And a few pretty screens for those of you who are into that.',
    keywords:    'UI, UX, ux designer portfolio, product designer portfolio'
  }
}


export const resume = () => {
  return {
    title:       'Jay Sylvester — Résumé / Work History',
    description: 'I\'ve led and contributed to just about every phase of the development lifecycle, including team management, information architecture, UX design, and full stack development.',
    keywords:    'UI, UX, ux designer resume, ux designer cv, ux manager, ux director, product designer, front end developer, ui engineer'
  }
}
