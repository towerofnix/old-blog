'use strict'

// Networking -----------------------------------------------------------------

const fetchArchiveData = () => {
  return fetch('data/post-index.json')
    .then(res => res.json())
    .then(posts => Promise.all(posts.map(
      file => fetch(`data/posts/${file}.json`)
        .then(res => res.json())
        .then(obj => Object.assign(obj, {file}))
    )))
}

const fetchPostMarkdown = title => {
  return fetch(`data/posts/${title}.md`)
    .then(res => res.text())
}

// Utilities ------------------------------------------------------------------

const domifyMarkdown = md => {
  const converter = new showdown.Converter()
  const html = converter.makeHtml(md)

  const div = document.createElement('div')
  div.classList.add('markdown')
  div.innerHTML = html

  return div
}

const timeout = (ms, promise) => {
  return Promise.race([
    new Promise(resolve => {
      setTimeout(() => resolve('timeout'), ms)
    }),

    promise
  ])
}

// Disqus ---------------------------------------------------------------------

const setupDisqus = () => {
  const disqusThread = document.createElement('div')
  disqusThread.id = 'disqus_thread'
  document.body.appendChild(disqusThread)

  const id = location.hash.slice(1)

  const disqusConfig = function() {
    // this.page.url = location.origin + `/disqus-hack/${id}`
    this.page.url = location.href
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

const setupBlankPage = title => {
  if (title == null) {
    title = 'Untitled page? (Frown!)'
  }

  document.title = title
  history.replaceState(null, title, location.href)

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
  a.appendChild(document.createTextNode('(Index.)'))

  const a2 = document.createElement('a')
  a2.href = '#archive'
  a2.appendChild(document.createTextNode('(Archive.)'))

  const p = document.createElement('p')
  p.appendChild(a)
  p.appendChild(document.createTextNode(' '))
  p.appendChild(a2)
  main.appendChild(p)

  return main
}

const buildPostsArchive = postData => {
  const table = document.createElement('table')

  for (let post of postData) {
    // TODO: Better method of storing post information, such as the date it
    // was written. For now we only have its title!
    const { name, file } = post

    const a = document.createElement('a')
    a.href = `#post-${file}`
    a.appendChild(document.createTextNode(name))

    const td = document.createElement('td')
    td.appendChild(a)

    const tr = document.createElement('tr')
    tr.appendChild(td)

    table.appendChild(tr)
  }

  return table
}

const loadIndex = () => {
  const main = setupBlankPage('Index')

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
  const main = setupBlankPage('Archive')

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
  const main = setupBlankPage(title)

  let markdownContainer, disqus

  return Promise.all([
    timeout(750,
      fetchPostMarkdown(title)
        .then(domifyMarkdown)
        .then(_md => { markdownContainer = _md })
    ).then(() => {
      if (!markdownContainer) {
        markdownContainer = document.createTextNode(
          'Timeout when downloading post! Reload the page, maybe?'
        )
      }
    }),

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

  const main = setupBlankPage('Not Found')
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
