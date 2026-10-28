import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import yaml from 'js-yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://limitlessreachfa.com';
const SITE_NAME = 'Limitless Reach Football Academy';
const DEFAULT_IMAGE = 'assets/hero-bg-1440.jpg';
const GENERATED_MARK = '<meta name="generator" content="limitless-reach-build">';
const KEEP_READING_COUNT = 2;

function readText(path) {
  return readFileSync(join(ROOT, path), 'utf8');
}

function writeIfChanged(path, text) {
  const target = join(ROOT, path);

  if (existsSync(target) && readFileSync(target, 'utf8') === text) {
    return false;
  }

  writeFileSync(target, text);
  return true;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function indent(text, spaces) {
  const pad = ' '.repeat(spaces);

  return text
    .split('\n')
    .map(function (line) {
      return line ? pad + line : line;
    })
    .join('\n');
}

function cleanPath(path) {
  return String(path).replace(/^\/+/, '');
}

function absoluteUrl(path) {
  return /^https?:\/\//.test(path) ? path : SITE_URL + '/' + cleanPath(path);
}

function parseEntry(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  if (!match) {
    throw new Error('The file has no settings block between --- lines.');
  }

  return { data: yaml.load(match[1]) || {}, body: match[2].trim() };
}

function normaliseDate(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value ? String(value).slice(0, 10) : '1970-01-01';
}

function byPriority(a, b) {
  return (
    Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
    b.date.localeCompare(a.date) ||
    a.slug.localeCompare(b.slug)
  );
}

function loadPosts() {
  const posts = readdirSync(join(ROOT, 'content/news'))
    .filter(function (name) {
      return name.endsWith('.md');
    })
    .map(function (name) {
      const slug = name.replace(/\.md$/, '');
      const { data, body } = parseEntry(readText('content/news/' + name));

      return { ...data, slug, body, date: normaliseDate(data.date) };
    })
    .filter(function (post) {
      return post.published !== false;
    });

  posts.forEach(function (post) {
    const missing = ['title', 'tag', 'summary', 'body'].filter(function (key) {
      return !post[key];
    });

    if (missing.length) {
      throw new Error('content/news/' + post.slug + '.md is missing: ' + missing.join(', '));
    }
  });

  return posts.sort(byPriority);
}

function renderBody(markdown) {
  let isFirstParagraph = true;

  const markdownRenderer = new Marked({
    renderer: {
      paragraph({ tokens }) {
        const className = isFirstParagraph ? 'article-lead' : 'article-text';

        isFirstParagraph = false;
        return '<p class="' + className + '">' + this.parser.parseInline(tokens) + '</p>\n';
      },
      heading({ tokens }) {
        return '<h2 class="article-h2">' + this.parser.parseInline(tokens) + '</h2>\n';
      },
      list(token) {
        const tag = token.ordered ? 'ol' : 'ul';
        const items = token.items
          .map(function (item) {
            return this.listitem(item);
          }, this)
          .join('');

        return '<' + tag + ' class="article-list">\n' + items + '</' + tag + '>\n';
      },
      blockquote({ tokens }) {
        const text = tokens
          .filter(function (token) {
            return token.type === 'paragraph';
          })
          .map(function (token) {
            return this.parser.parseInline(token.tokens);
          }, this)
          .join(' ');

        return '<blockquote class="article-quote">' + text + '</blockquote>\n';
      }
    }
  });

  return markdownRenderer.parse(markdown).trim();
}

function readMoreLink(post) {
  const arrow = ' <span class="btn-arrow">&rarr;</span>';

  if (post.show_read_more === false) {
    return '<a class="news-read-more is-disabled" role="link" aria-disabled="true">Read More' + arrow + '</a>';
  }

  return '<a href="news-' + post.slug + '.html" class="news-read-more">Read More' + arrow + '</a>';
}

function cardHtml(post, options) {
  const badge = post.badge ? '\n  <span class="news-tag-plain">' + escapeHtml(post.badge) + '</span>' : '';
  const heading = options.heading;

  return [
    '<article class="' + options.className + '">',
    '  <div class="news-card-tags">',
    '    <span class="news-tag">' + escapeHtml(post.tag) + '</span>' + indent(badge, 2),
    '  </div>',
    '  <' + heading + ' class="news-card-heading">' + escapeHtml(post.title) + '</' + heading + '>',
    '  <p class="news-card-text">' + escapeHtml(post.summary) + '</p>',
    '  ' + readMoreLink(post),
    '</article>'
  ].join('\n');
}

function replaceElementContent(html, openTag, content) {
  const start = html.indexOf(openTag);

  if (start === -1) {
    throw new Error('Could not find ' + openTag);
  }

  const innerStart = start + openTag.length;
  const tagName = openTag.match(/^<(\w+)/)[1];
  const pattern = new RegExp('<' + tagName + '\\b|</' + tagName + '>', 'g');
  let depth = 1;
  let match;

  pattern.lastIndex = innerStart;

  while ((match = pattern.exec(html))) {
    depth += match[0].startsWith('</') ? -1 : 1;

    if (depth === 0) {
      return html.slice(0, innerStart) + content + html.slice(match.index);
    }
  }

  throw new Error('Could not find the end of ' + openTag);
}

function extractChrome(newsPage) {
  const head = newsPage.slice(0, newsPage.indexOf('</head>'));
  const topStart = newsPage.indexOf('<div class="announcement-bar">');
  const topEnd = newsPage.indexOf('</header>', topStart) + '</header>'.length;
  const footerStart = newsPage.indexOf('<footer class="site-footer-v2">');
  const footerEnd = newsPage.indexOf('</footer>') + '</footer>'.length;

  if (topStart === -1 || footerStart === -1) {
    throw new Error('news.html is missing its header or footer.');
  }

  return {
    head,
    top: newsPage.slice(topStart, topEnd),
    footer: newsPage.slice(footerStart, footerEnd),
    tail: newsPage.slice(footerEnd)
  };
}

function metaTags(post) {
  const url = SITE_URL + '/news-' + post.slug + '.html';
  const image = absoluteUrl(post.image || DEFAULT_IMAGE);

  return [
    GENERATED_MARK,
    '<meta name="description" content="' + escapeHtml(post.summary) + '">',
    '<link rel="canonical" href="' + url + '">',
    '<meta property="og:site_name" content="' + SITE_NAME + '">',
    '<meta property="og:type" content="article">',
    '<meta property="og:title" content="' + escapeHtml(post.title) + '">',
    '<meta property="og:description" content="' + escapeHtml(post.summary) + '">',
    '<meta property="og:url" content="' + url + '">',
    '<meta property="og:image" content="' + image + '">',
    '<meta property="article:published_time" content="' + post.date + '">',
    '<meta name="twitter:card" content="summary_large_image">'
  ].join('\n');
}

function asideHtml(post) {
  const facts = post.glance || [];

  if (!facts.length && !post.cta_label) {
    return '';
  }

  const rows = facts
    .map(function (fact, index) {
      const last = index === facts.length - 1 ? ' aside-field-last' : '';

      return [
        '<div class="aside-field' + last + '">',
        '  <span class="aside-label">' + escapeHtml(fact.label) + '</span>',
        '  <p class="aside-text">' + escapeHtml(fact.text) + '</p>',
        '</div>'
      ].join('\n');
    })
    .join('\n');

  const button = post.cta_label
    ? '\n<a href="' + escapeHtml(post.cta_link || 'contact.html') + '" class="btn-dark aside-btn">' +
      escapeHtml(post.cta_label) + ' <span class="btn-arrow">&rarr;</span></a>'
    : '';

  return '<aside class="article-aside">\n  <h3 class="aside-heading">At a Glance</h3>\n' +
    indent(rows + button, 2) + '\n</aside>';
}

function keepReadingHtml(others) {
  if (!others.length) {
    return '';
  }

  const cards = others
    .map(function (other) {
      return indent(cardHtml(other, { className: 'news-card keep-reading-card', heading: 'h3' }), 6);
    })
    .join('\n');

  return [
    '<section class="keep-reading-section">',
    '  <div class="keep-reading-inner">',
    '    <div class="keep-reading-header">',
    '      <div class="eyebrow">',
    '        <span class="eyebrow-dot"></span>',
    '        <span>MORE NEWS</span>',
    '      </div>',
    '      <h2 class="keep-reading-heading">Keep reading.</h2>',
    '    </div>',
    '',
    '    <div class="keep-reading-cards">',
    cards,
    '    </div>',
    '  </div>',
    '</section>'
  ].join('\n');
}

function articlePage(post, others, chrome) {
  const head = chrome.head
    .replace(/<title>[\s\S]*?<\/title>/, '<title>' + escapeHtml(post.title) + ' — ' + SITE_NAME + '</title>')
    .concat('\n' + metaTags(post) + '\n');
  const badge = post.badge ? '\n      <span class="article-tag-plain">' + escapeHtml(post.badge) + '</span>' : '';
  const intro = post.intro || post.summary;
  const aside = asideHtml(post);

  const parts = [
    head + '</head>',
    '<body class="article-page new-design">',
    '',
    chrome.top,
    '',
    [
      '<header class="article-header">',
      '  <img src="assets/hero-badge.svg" alt="" class="page-header-watermark" aria-hidden="true">',
      '  <div class="article-header-inner">',
      '    <a href="news.html" class="article-back">&larr; All News</a>',
      '    <div class="article-header-tags">',
      '      <span class="news-tag">' + escapeHtml(post.tag) + '</span>' + badge,
      '    </div>',
      '    <h1 class="article-heading">' + escapeHtml(post.title) + '</h1>',
      '    <p class="article-header-text">' + escapeHtml(intro) + '</p>',
      '  </div>',
      '</header>'
    ].join('\n'),
    '',
    [
      '<section class="article-body-section">',
      '  <div class="article-body-inner">',
      '    <div class="article-body">',
      indent(renderBody(post.body), 6),
      '    </div>',
      aside ? '\n' + indent(aside, 4) : '',
      '  </div>',
      '</section>'
    ].join('\n'),
    '',
    keepReadingHtml(others),
    '',
    [
      '<section class="final-cta">',
      '  <div class="final-cta-inner">',
      '    <h2 class="final-cta-heading">Ready to Reach Further?</h2>',
      '    <p class="final-cta-text">Register for a trial and be the first to hear about dates, training and academy opportunities.</p>',
      '    <a href="register.html" class="btn-dark">Register for Trial <span class="btn-arrow">&rarr;</span></a>',
      '  </div>',
      '</section>'
    ].join('\n'),
    '',
    chrome.footer + chrome.tail
  ];

  return parts.join('\n');
}

function removeStalePages(keepNames) {
  readdirSync(ROOT)
    .filter(function (name) {
      return /^news-.+\.html$/.test(name) && !keepNames.has(name);
    })
    .forEach(function (name) {
      if (readText(name).includes(GENERATED_MARK)) {
        unlinkSync(join(ROOT, name));
        console.log('removed ' + name);
      }
    });
}

function main() {
  const posts = loadPosts();
  const newsPage = readText('news.html');
  const chrome = extractChrome(newsPage);
  const cards = posts
    .map(function (post) {
      return indent(cardHtml(post, { className: 'news-card', heading: 'h2' }), 6);
    })
    .join('\n');
  const names = new Set();

  posts.forEach(function (post) {
    const name = 'news-' + post.slug + '.html';
    const others = posts
      .filter(function (other) {
        return other.slug !== post.slug;
      })
      .slice(0, KEEP_READING_COUNT);

    names.add(name);

    if (writeIfChanged(name, articlePage(post, others, chrome))) {
      console.log('wrote ' + name);
    }
  });

  removeStalePages(names);

  const updatedNews = replaceElementContent(newsPage, '<div class="news-cards">', '\n' + cards + '\n    ');

  if (writeIfChanged('news.html', updatedNews)) {
    console.log('wrote news.html');
  }

  console.log(posts.length + ' news posts built.');
}

main();
