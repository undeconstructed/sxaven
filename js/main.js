import { make_class, make_channel, run_proc } from './classis.js'
import { join, mkel, shuffle, isProbablyInstalled, hook, hook_chan, switchy, select, animate, main, timer, getRandomInt } from './util.js'

const latinBig =   [...'ABCĈDEFGĜHĤIJĴKLMNOPRSŜTUŬVZ']
const latinSmall = [...'abcĉdefgĝhĥijĵklmnoprsŝtuŭvz']
const shavian =    [...'𐑨𐑚𐑔𐑗𐑛𐑧𐑓𐑜𐑡𐑣𐑙𐑦𐑢𐑠𐑒𐑤𐑫𐑵𐑩𐑐𐑮𐑕𐑖𐑑𐑪𐑘𐑝𐑟']
const latinBigAccent = [...'Á', 0, 0, 0, 0, 'É', 0, 0, 0, 0, 0, 'Í', 0, 0, 0, 0, 0, 0, 'Ó', 0, 0, 0, 0, 0, 'Ú', 0, 0, 0]
const latinSmallAccent = [...'á', 0, 0, 0, 0, 'é', 0, 0, 0, 0, 0, 'í', 0, 0, 0, 0, 0, 0, 'ó', 0, 0, 0, 0, 0, 'ú', 0, 0, 0]
// const shavianAccent =    [...'𐑨', 0, 0, 0, 0, '𐑧', 0, 0, 0, 0, 0, '𐑦', 0, 0, 0, 0, 0, 0, '𐑩', 0, 0, 0, 0, 0, '𐑪', 0, 0, 0]
const anyLetter = /\p{Letter}/u

const basicTags = [ "P", "DIV", "SPAN", "EM", "STRONG", "I", "B", "H1", "H2", "H3", "H4", "H5", "H6", "BR", "HR", "UL", "OL", "LI", "DL", "DT", "DD" ]

function canHat(letter) {
  return "cghjsu".indexOf(latinSmall[letter.code]) >= 0
}

const mixPatterns = [
  ['aŭ', ']'], ['la', '\\'], ['kaj', '/'],
  ['as', '@'], ['es', '#'], ['is', '$'], ['os', '^'], ['us', '&'],
  ['ojn', '\''], ['on', '*'], ['oj', '_'],
  ['ajn', '['], ['an', '{'], ['aj', '}']
]

function rewriteMix(mixText) {
  for (let r of mixPatterns) {
    mixText = mixText.replace(r[0], r[1])
  }
  return mixText
}

function processTextNode(textNode, unicode) {
  let input = textNode.textContent
  let newNode = mkel('span')

  let dotWord = false
  let lastLetter = null

  let latinWord = ''
  let mixWord = ''
  let shavianWord = ''

  let pushWord = function() {
    if (shavianWord == '') {
      return
    }

    if (dotWord) {
      shavianWord = '·' + shavianWord
      mixWord = '·' + mixWord
      dotWord = false
    }

    let span = mkel('span', { classes: [ 'w' ] })
    let ss = mkel('span', { text: shavianWord })
    let sm = mkel('span', { classes: [ 'mix' ], text: rewriteMix(mixWord) })
    let sl = mkel('span', { text: latinWord })
    if (unicode) {
      span.append(ss, sl)
    } else {
      span.append(sm, sl)
    }
    newNode.append(span)

    latinWord = mixWord = shavianWord = ''
  }

  let pushLast = function() {
    if (lastLetter != null) {
      let code = lastLetter.code
      if (lastLetter.stress) {
        latinWord += lastLetter.alpha[code]
        let l = latinSmall[code]
        mixWord += (String.fromCodePoint(l.codePointAt(0), 0x0301)) // must not normalize() !
        let s = shavian[code]
        shavianWord += (String.fromCodePoint(s.codePointAt(0), 0x0301)).normalize()
      } else {
        latinWord += lastLetter.alpha[code]
        mixWord += latinSmall[code]
        shavianWord += shavian[code]
      }
      lastLetter = null
    }
  }

  let pushInput = function(inLetter) {
    if (inLetter == null) {
      pushLast()
      pushWord()
      return
    }

    if (inLetter == 'x') {
      if (lastLetter != null && canHat(lastLetter)) {
        lastLetter.code++
        pushLast()
      } else {
        pushLast()
        latinWord += 'x'
        shavianWord += 'x'
      }
      return
    }

    if (inLetter == '-') {
      pushLast()
      latinWord += '-'
      shavianWord += '-'
      return
    }

    if (inLetter == '·') {
      dotWord = true
      return
    }

    let idx = latinBig.indexOf(inLetter)
    if (idx >= 0) {
      pushLast()
      lastLetter = { code: idx, alpha: latinBig, stress: false }
      dotWord = true
      return
    }

    idx = latinSmall.indexOf(inLetter)
    if (idx >= 0) {
      pushLast()
      lastLetter = { code: idx, alpha: latinSmall, stress: false }
      return
    }

    idx = latinBigAccent.indexOf(inLetter)
    if (idx >= 0) {
      pushLast()
      lastLetter = { code: idx, alpha: latinBigAccent, stress: true }
      dotWord = true
      return
    }

    idx = latinSmallAccent.indexOf(inLetter)
    if (idx >= 0) {
      pushLast()
      lastLetter = { code: idx, alpha: latinSmallAccent, stress: true }
      return
    }

    idx = shavian.indexOf(inLetter)
    if (idx >= 0) {
      pushLast()
      if (dotWord && latinWord == '') {
        lastLetter = { code: idx, alpha: latinBig, stress: false }
      } else {
        lastLetter = { code: idx, alpha: latinSmall, stress: false }
      }
      pushLast()
      return
    }

    if (anyLetter.test(inLetter)) {
      pushLast()
      latinWord += inLetter
      shavianWord += inLetter.toLowerCase()
      return
    }

    pushLast()
    pushWord()
    newNode.append(inLetter)
  }

  for (let inLetter of input) {
    pushInput(inLetter)
  }

  pushInput(null)

  return newNode
}

function copyElementNode(elementNode) {
  let tagName = elementNode.tagName
  if (tagName == 'A') {
    return mkel('A', { href: elementNode.href })
  }
  if (tagName == 'IMG') {
    return mkel('IMG', { src: elementNode.src })
  }
  if (basicTags.includes(tagName)) {
    return mkel(tagName)
  }
  return mkel('FOO')
}

function processElementNode(elementNode, unicode) {
  let newChildren = processNodes(elementNode.childNodes, unicode)
  let newNode = copyElementNode(elementNode)
  newNode.append(...newChildren)
  return newNode
}

function processNodes(nodes, unicode) {
  let newNodes = []

  for (let node of nodes) {
    if (node.nodeType == Node.TEXT_NODE) {
      let newNode = processTextNode(node, unicode)
      newNodes.push(newNode)
    } if (node.nodeType == Node.ELEMENT_NODE) {
      let newNode = processElementNode(node, unicode)
      if (newNode.tagName == "FOO") {
        newNodes.push(...newNode.childNodes)
      } else {
        newNodes.push(newNode)
      }
    }
  }

  return newNodes
}

function process(inputArea, outputArea, unicode) {
  let newNodes = processNodes(inputArea.childNodes, unicode)
  output.replaceChildren(...newNodes)
}

main(function ({window, document, localStorage}) {
  // console.log('start')

  let startup = true

  let header = document.querySelector('#header h1')
  for (let i = 0; i < shavian.length; i++) {
    let span = mkel('span', { classes: [ 'w' ] })
    let ss = mkel('span', { text: shavian[i] })
    let sl = mkel('span', { text: latinSmall[i] })
    span.append(ss, sl)
    header.append(span)
  }

  let inform = document.querySelector('#inform')
  let unicodeSwitch = inform.querySelector('[name=unicode]')
  let inputArea = inform.querySelector('.entry')
  let outputArea = document.querySelector('#output')

  let activate = function() {
    process(inputArea, outputArea, unicodeSwitch.checked)
  }

  hook(inform, 'submit', [], e => {
    e.preventDefault()
    activate()
  }, [])

  hook(inform, 'reset', [], e => {
    inputArea.replaceChildren()
    activate()
  }, [])

  hook(inputArea, 'focus', [], e => {
    if (startup) {
      inputArea.replaceChildren()
      startup = false
    }
  }, [])

  // hook(inputArea, 'paste', [], e => {
  //   e.preventDefault()
  //   console.log(e.clipboardData.getData('application/html'))
  // }, [])

  hook(inputArea, 'blur', [], e => {
    e.preventDefault()
    activate()
  }, [])

  hook(unicodeSwitch, 'change', [], e => {
    e.preventDefault()
    activate()
  }, [])

  activate()
})
