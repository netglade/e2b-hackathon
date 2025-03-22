interface Mcps {
  text: string
}

declare global {
  var mcpsInstance: Mcps | undefined
}

const mcps = global.mcpsInstance || { text: 'ahojky' }

if (process.env.NODE_ENV !== 'production') {
  global.mcpsInstance = mcps
}

export default mcps
