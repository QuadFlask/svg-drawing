import React, { useEffect, useRef, Fragment, useCallback } from 'react'
import Two from 'two.js'
import { render } from 'react-dom'
import { createGrid } from './createGrid'
import { SvgDrawing } from '../SvgDrawing'
import SvgAnimation from '../SvgAnimation'

const size = 30
const gridImage = (createGrid({
  size
}).renderer as any).domElement.toDataURL('image/png')

const mimeTypeMap = {
  png: 'image/png',
  jpg: 'image/jpeg',
  svg: 'image/svg+xml'
}
const getRandomInt = (max: number): number =>
  Math.floor(Math.random() * Math.floor(max))
const getRandomColor = (): string =>
  `#${Array.from({ length: 3 }, () =>
    String(getRandomInt(255).toString(16)).padStart(2, '0')
  ).join('')}`

const getMimeType = (extention: keyof typeof mimeTypeMap) =>
  mimeTypeMap.hasOwnProperty(extention)
    ? mimeTypeMap[extention]
    : mimeTypeMap['png']
const downloadBlob = (base64: string, extention: keyof typeof mimeTypeMap) => {
  const bin = atob(base64.replace(/^.*,/, ''))
  const buffer = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    buffer[i] = bin.charCodeAt(i)
  }
  const filename = `${new Date().toISOString()}.${extention}`
  const blob = new Blob([buffer.buffer], {
    type: getMimeType(extention)
  })
  if (window.navigator.msSaveBlob) {
    // IE
    window.navigator.msSaveBlob(blob, filename)
  } else if (window.URL && window.URL.createObjectURL) {
    // Firefox, Chrome, Safari
    const a = document.createElement('a')
    a.download = filename
    a.href = window.URL.createObjectURL(blob)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } else {
    // Other
    window.open(base64, '_blank')
  }
}

const Example = () => {
  const divRef = useRef<HTMLDivElement | null>(null)
  const drawing = useRef<SvgDrawing | null>(null)
  const animationRef = useRef<HTMLDivElement | null>(null)
  const animation = useRef<SvgAnimation | null>(null)
  const stopShaking = useRef<(() => void) | null>(null)
  const clickShaking = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (stopShaking && stopShaking.current) {
      stopShaking.current()
      stopShaking.current = null
      return
    }
    if (!animation.current) return
    stopShaking.current = animation.current.shaking()
  }, [])
  const animationFrameUpdate = useCallback(() => {
    if (!animation.current || !drawing.current) return
    animation.current.clear()
    const drawingClone = drawing.current.scene.clone()
    animation.current.scene.add(drawingClone)
    animation.current.update()
  }, [])
  const clickDownload = useCallback(
    (extention: keyof typeof mimeTypeMap) => (
      e: React.MouseEvent<HTMLElement>
    ) => {
      if (!animation.current) return
      const domElemet = (animation.current.renderer as any).domElement
      const blob = domElemet.toDataURL(getMimeType(extention))
      downloadBlob(blob, extention)
    },
    []
  )
  const clickDownloadSVG = useCallback(() => {
    if (!drawing.current) return
    const data = drawing.current.toSvgBase64()
    if (!data) return
    downloadBlob(data, 'svg')
  }, [])
  const clickClear = useCallback(() => {
    if (!drawing.current) return
    drawing.current.clear()
    animationFrameUpdate()
  }, [animationFrameUpdate])
  const clickUndo = useCallback(() => {
    if (!drawing.current) return
    const path = drawing.current.scene.children
    if (path.length === 0) return
    drawing.current.remove(path[path.length - 1])
    animationFrameUpdate()
  }, [animationFrameUpdate])
  const clickRandomColor = useCallback(() => {
    if (!drawing.current) return
    drawing.current.penColor = getRandomColor()
  }, [])

  const changePenWidth = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!drawing.current) return
      const penWidth = Number(e.target.value)
      drawing.current.penWidth = penWidth
    },
    []
  )
  const changeCap = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const cap = e.target.value
    if (!['butt', 'round', 'square'].includes(e.target.value)) return
    if (!drawing.current) return
    drawing.current.strokeCap = cap
  }, [])
  const changeLineJoin = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const lineJoin = e.target.value
      if (!['miter', 'round', 'bevel'].includes(e.target.value)) return
      if (!drawing.current) return
      drawing.current.strokeLineJoin = lineJoin
    },
    []
  )
  useEffect(() => {
    if (drawing.current) return
    if (!divRef.current) return
    drawing.current = new SvgDrawing({
      el: divRef.current,
      autostart: true
    })
  })
  useEffect(() => {
    if (!animationRef.current) return
    animation.current = new SvgAnimation({
      el: animationRef.current,
      type: Two.Types.canvas,
      shakingRange: 10
    })
  })
  return (
    <Fragment>
      <div>
        pen width
        <input type="range" min={3} max={50} onChange={changePenWidth} />
      </div>
      <div>
        stroke cap
        <select onChange={changeCap}>
          <option>round</option>
          <option>butt</option>
          <option>square</option>
        </select>
      </div>
      <div>
        stroke line join
        <select onChange={changeLineJoin}>
          <option>round</option>
          <option>mitter</option>
          <option>bevel</option>
        </select>
      </div>
      <button onClick={clickRandomColor}>Change Color</button>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flexWrap'
        }}
      >
        <div>
          <div
            ref={divRef}
            onTouchEnd={animationFrameUpdate}
            onMouseUp={animationFrameUpdate}
            style={{
              background: `url('${gridImage}') 0 0 repeat`,
              backgroundSize: `${size}px ${size}px`,
              width: 500,
              height: 500,
              margin: 'auto'
            }}
          />
          <button onClick={clickDownloadSVG}>Download SVG</button>
          <button onClick={clickClear}>Clear</button>
          <button onClick={clickUndo}>Undo</button>
        </div>
        <div>
          <div
            ref={animationRef}
            style={{
              border: '1px solid #bbb',
              width: 500,
              height: 500,
              margin: 'auto'
            }}
          />
          <button onClick={clickDownload('png')}>Download PNG</button>
          <button onClick={clickDownload('jpg')}>Download JPG</button>
          <button onClick={clickShaking}>Shaking Line</button>
        </div>
      </div>
    </Fragment>
  )
}

const app = document.createElement('div')
document.body.appendChild(app)
render(<Example />, app)
