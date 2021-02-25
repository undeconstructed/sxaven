import { make_class, make_channel, run_proc } from './classis.js'
import { join, mkel, shuffle, isProbablyInstalled, hook, hook_chan, switchy, select, animate, main, timer, getRandomInt } from './util.js'

const latinBig =   [...'ABCĈDEFGĜHĤIJĴKLMNOPRSŜTUŬVZ']
const latinSmall = [...'abcĉdefgĝhĥijĵklmnoprsŝtuŭvz']
const shavian =    [...'𐑨𐑚𐑔𐑗𐑛𐑧𐑓𐑜𐑡𐑣𐑙𐑦𐑢𐑠𐑒𐑤𐑫𐑵𐑩𐑐𐑮𐑕𐑖𐑑𐑪𐑘𐑝𐑟']

const basicTags = [ "P", "DIV", "SPAN", "EM", "STRONG", "I", "B", "H1", "H2", "H3", "H4", "H5", "H6", "BR", "HR", "UL", "OL", "LI" ]

function trans(letter) {
  let idx = latinBig.indexOf(letter)
  if (idx >= 0) {
    return '·' + shavian[idx]
  }

  idx = latinSmall.indexOf(letter)
  if (idx >= 0) {
    return shavian[idx]
  }

  return letter
}

function processTextNode(textNode) {
  let input = textNode.textContent
  let newNode = mkel('span')

  let latinWord = ''
  let shavianWord = ''

  let pushWord = function() {
    if (shavianWord == '') {
      return
    }

    let span = mkel('span', { classes: [ 'w' ] })
    let ss = mkel('span', { text: shavianWord })
    let sl = mkel('span', { text: latinWord })
    span.append(ss, sl)
    newNode.append(span)

    latinWord = shavianWord = ''
  }

  for (let inLetter of input) {
    let outLetter = trans(inLetter)
    if (outLetter != inLetter || outLetter == '-') {
      latinWord += inLetter
      shavianWord += outLetter
      continue
    }

    pushWord()

    newNode.append(outLetter)
  }

  pushWord()

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
  if (!basicTags.includes(tagName)) {
    return mkel('FOO')
  }
  return mkel(tagName)
}

function processElementNode(elementNode) {
  let newChildren = processNodes(elementNode.childNodes)
  let newNode = copyElementNode(elementNode)
  newNode.append(...newChildren)
  return newNode
}

function processNodes(nodes) {
  let newNodes = []

  for (let node of nodes) {
    if (node.nodeType == Node.TEXT_NODE) {
      let newNode = processTextNode(node)
      newNodes.push(newNode)
    } if (node.nodeType == Node.ELEMENT_NODE) {
      let newNode = processElementNode(node)
      if (newNode.tagName == "FOO") {
        newNodes.push(...newNode.childNodes)
      } else {
        newNodes.push(newNode)
      }
    }
  }

  return newNodes
}

function process(inputArea, outputArea) {
  let newNodes = processNodes(inputArea.childNodes)
  output.replaceChildren(...newNodes)
}

main(function ({window, document, localStorage}) {
  console.log('start')

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
  let inputArea = inform.querySelector('.entry')
  let outputArea = document.querySelector('#output')

  hook(inform, 'submit', [], e => {
    e.preventDefault()
    process(inputArea, outputArea)
  }, [])

  hook(inform, 'reset', [], e => {
    inputArea.replaceChildren()
    process(inputArea, outputArea)
  }, [])

  hook(inputArea, 'focus', [], e => {
    if (startup) {
      inputArea.replaceChildren()
      startup = false
    }
  }, [])

  hook(inputArea, 'blur', [], e => {
    e.preventDefault()
    process(inputArea, outputArea)
  }, [])

  process(inputArea, outputArea)
})
