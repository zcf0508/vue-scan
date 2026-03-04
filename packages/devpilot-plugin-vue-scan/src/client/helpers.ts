export interface ComponentBoundingRect {
  top: number
  left: number
  width: number
  height: number
  right: number
  bottom: number
}

const DEFAULT_RECT: ComponentBoundingRect = {
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: 0,
  height: 0,
}

export function getInstanceName(instance: any): string {
  const type = instance?.type || instance?.$vnode || {}
  const name = type?.name || type?._componentTag || type?.tag
    || type?.__VUE_DEVTOOLS_COMPONENT_GUSSED_NAME__ || type?.__name
  if (name)
    return name
  if (instance?.root === instance || instance?.$root === instance)
    return 'Root'

  // guess from parent
  for (const key in instance?.parent?.type?.components) {
    if (instance.parent.type.components[key] === instance?.type)
      return key
  }
  for (const key in instance?.appContext?.components) {
    if (instance.appContext.components[key] === instance?.type)
      return key
  }

  // from filename
  const file = type?.__file
  if (file) {
    const base = file.split(/[/\\]/).pop() || ''
    return base.replace(/\.vue$/, '')
  }

  return 'Anonymous Component'
}

function isFragment(instance: any): boolean {
  const subTreeType = instance?.subTree?.type
  if (!subTreeType)
    return false
  const appRecord = instance?.__VUE_DEVTOOLS_NEXT_APP_RECORD__
    || instance?.root?.appContext?.app?.__VUE_DEVTOOLS_NEXT_APP_RECORD__
  if (appRecord)
    return appRecord?.types?.Fragment === subTreeType
  return false
}

function createRect() {
  const rect = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    get width() { return rect.right - rect.left },
    get height() { return rect.bottom - rect.top },
  }
  return rect
}

function mergeRects(a: any, b: any) {
  if (!a.top || b.top < a.top)
    a.top = b.top
  if (!a.bottom || b.bottom > a.bottom)
    a.bottom = b.bottom
  if (!a.left || b.left < a.left)
    a.left = b.left
  if (!a.right || b.right > a.right)
    a.right = b.right
  return a
}

let range: Range | null = null
function getTextRect(node: any) {
  if (!range)
    range = document.createRange()
  range.selectNode(node)
  return range.getBoundingClientRect()
}

function getFragmentRect(vnode: any): ComponentBoundingRect {
  const rect = createRect()
  if (!vnode.children)
    return rect
  for (let i = 0; i < vnode.children.length; i++) {
    const childVnode = vnode.children[i]
    let childRect
    if (childVnode.component) {
      childRect = getComponentBoundingRect(childVnode.component)
    }
    else if (childVnode.el) {
      const el = childVnode.el
      if (el.nodeType === 1 || el.getBoundingClientRect)
        childRect = el.getBoundingClientRect()
      else if (el.nodeType === 3 && el.data.trim())
        childRect = getTextRect(el)
    }
    if (childRect)
      mergeRects(rect, childRect)
  }
  return rect
}

export function getComponentBoundingRect(instance: any): ComponentBoundingRect {
  const el = instance?.subTree?.el || instance?.$el
  if (typeof window === 'undefined')
    return DEFAULT_RECT
  if (isFragment(instance))
    return getFragmentRect(instance?.subTree)
  if (el?.nodeType === 1)
    return el.getBoundingClientRect()
  if (instance?.subTree?.component || instance?.$vnode)
    return getComponentBoundingRect(instance?.subTree?.component || instance?.$vnode)
  return DEFAULT_RECT
}

export function isInViewport(bounds: ComponentBoundingRect): boolean {
  return !(
    bounds.left >= window.innerWidth
    || bounds.right <= 0
    || bounds.top >= window.innerHeight
    || bounds.bottom <= 0
  )
}
