'use strict'

// Logic, networking ----------------------------------------------------------

const fetchArchiveData = () => {
  return fetch('data/post-index.json')
    .then(res => res.json())
}

const fetchPostMarkdown = title => {
  return fetch(`data/posts/${title}.md`)
    .then(res => res.text())
}

const domifyMarkdown = md => {
  const converter = new showdown.Converter()
  const html = converter.makeHtml(md)

  const div = document.createElement('div')
  div.classList.add('markdown')
  div.innerHTML = html

  return div
}

// Disqus

const setupDisqus = () => {
  const disqusThread = document.createElement('div')
  disqusThread.id = 'disqus_thread'
  document.body.appendChild(disqusThread)

  const id = location.hash.slice(1)

  const disqusConfig = function() {
    this.page.url = location.origin + `/disqus-hack/${id}`
    this.page.identifier = id
  }

  if (window.DISQUS) {
    DISQUS.reset({
      reload: true,
      config: disqusConfig
    })
  } else {
    window.disqus_config = disqusConfig

    const disqusScript = document.createElement('script')
    disqusScript.src = 'https://another-blog-test.disqus.com/embed.js'
    disqusScript.setAttribute('data-timestamp', +new Date())
    document.body.appendChild(disqusScript)
  }

  return Promise.resolve(disqusThread)
}

// Views, DOM building --------------------------------------------------------

const removeIntro = () => {
  document.getElementById('intro').remove()
}

const setupBlankPage = () => {
  const oldMain = document.body.querySelector('.main')
  if (oldMain) {
    oldMain.remove()
  }

  const main = buildBlankPage()
  document.body.appendChild(main)
  return main
}

const buildBlankPage = () => {
  const main = document.createElement('div')
  main.classList.add('main')

  const a = document.createElement('a')
  a.href = '#index'
  a.appendChild(document.createTextNode('(To index.)'))

  const p = document.createElement('p')
  p.appendChild(a)
  main.appendChild(p)

  return main
}

const buildPostsArchive = postData => {
  const table = document.createElement('table')

  for (let post of postData) {
    // TODO: Better method of storing post information, such as the date it
    // was written. For now we only have its title!
    const title = post

    const a = document.createElement('a')
    a.href = `#post-${title}`
    a.appendChild(document.createTextNode(title))

    const td = document.createElement('td')
    td.appendChild(a)

    const tr = document.createElement('tr')
    tr.appendChild(td)

    table.appendChild(tr)
  }

  return table
}

const loadIndex = () => {
  const main = setupBlankPage()

  const p = document.createElement('p')

  p.innerHTML = (
    'Welcome to the site! It\'s pretty blank right now, but it\'ll ' +
    'hopefully work well enough as a basic blog. It\'d probably be best to ' +
    'start at the <a href=\'#archive\'>archive</a> (though in the future ' +
    'I\'ll probably set up a more convenient category sistem).'
  )

  main.appendChild(p)
}

const loadArchive = () => {
  const main = setupBlankPage()

  let table

  return fetchArchiveData()
    .then(buildPostsArchive)
    .then(_table => {table = _table})
    .then(() => {
      const archiveHeading = document.createElement('h1')
      archiveHeading.appendChild(document.createTextNode('Archive'))
      main.appendChild(archiveHeading)

      const archiveP = document.createElement('p')
      archiveP.appendChild(document.createTextNode(
        'A quick list of all of the stuff I\'ve posted here.'
      ))
      main.appendChild(archiveP)

      main.appendChild(table)
    })
    .catch(err => console.error(err))
}

const loadPost = title => {
  const main = setupBlankPage()

  let markdownContainer, disqus

  return Promise.all([
    fetchPostMarkdown(title)
      .then(domifyMarkdown)
      .then(_md => { markdownContainer = _md }),

    setupDisqus()
      .then(_disqus => { disqus = _disqus })
  ]).then(() => {
    main.appendChild(markdownContainer)
    main.appendChild(disqus)
  })
}

const loadNotFound = () => {
  const p = document.createElement('p')
  p.appendChild(document.createTextNode(
    'Whoops! That page couldn\'t be found. That\'s probably my fault, sorry. '
  ))

  const a = document.createElement('a')
  a.href = '#index'
  a.appendChild(document.createTextNode(
    'Maybe you\'ll have better luck at the index?'
  ))
  p.appendChild(a)

  const main = setupBlankPage()
  main.appendChild(p)
}

// History/link management ----------------------------------------------------

const loadPage = hash => {
  if (hash === '') {
    return loadIndex()
  } else if (hash === '#index') {
    history.pushState({}, 'Index', '#')
    return loadIndex()
  } else if (hash === '#archive') {
    return loadArchive()
  } else if (hash.startsWith('#post-')) {
    const titleMatch = location.hash.match(/^#post-(.+)/)
    if (!titleMatch) {
      // TODO: invalid path handler.
      return loadNotFound()
    } else {
      return loadPost(titleMatch[1])
    }
  } else {
    return loadNotFound()
  }
}

window.addEventListener('load', evt => {
  Promise.resolve(loadPage(window.location.hash))
    .then(removeIntro)
    .catch(console.error)
})

window.addEventListener('hashchange', evt => {
  Promise.resolve(loadPage(new URL(evt.newURL).hash))
    .catch(console.error)
})

// Let show-intro.js know that we've loaded the main page!
window.DID_LOAD_WEBSITE = true