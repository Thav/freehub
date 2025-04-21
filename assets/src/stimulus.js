import { Application } from '@hotwired/stimulus'
const controllers = import.meta.globEager('./controllers/**/*-controller.ts')

window.Stimulus = Application.start()

Object.keys(controllers).forEach((key) => {
  // Strip the leaderingg "./controllers" and the trailing "-controller.ts"
  const controllerName = key.replace(/^\.\/controllers\//, '').replace(/-controller\.ts$/, '')
  window.Stimulus.register(controllerName, controllers[key].default)
})
