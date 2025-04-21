import { Controller } from '@hotwired/stimulus'

declare global {
  var Turbo: {
    visit(url: string, options?: { action?: string, frame?: string })
  };
}

export default class extends Controller {
  static values = { query: String }
  static targets = ['input', 'date', 'choice']
  declare readonly queryValue: string
  declare readonly inputTarget: HTMLInputElement
  declare readonly dateTarget: HTMLInputElement
  declare readonly choiceTarget: HTMLSelectElement

  connect() {
    const url = new URL(window.location.toString())
    const query = url.searchParams.get(this.queryValue)
    if(query) {
      this.inputTarget.value = query
      this.dateTarget.value = query
      this.choiceTarget.value = query
    }
  }

  setFrameFilter(value: string) {
    const frame = document.querySelector('turbo-frame#table')
    // @ts-ignore
    const url = new URL(frame.src || window.location)
    if(!value) {
      url.searchParams.delete(this.queryValue)
    }else {
      url.searchParams.set(this.queryValue, value)
    }
    Turbo.visit(url.toString(), { frame: 'table', action: 'replace' })
  }

  setText(event) {
    this.setFrameFilter(event.target.value)
  }

  // Event from type="date" input
  setDate(event: InputEvent) {
    if(!(event.target as HTMLInputElement).value) {
      this.setFrameFilter('')
      return
    }
    // parse date to -> 2021-01-01
    const date = new Date((event.target as HTMLInputElement).value)
    this.setFrameFilter(date.toISOString().split('T')[0])
  }

  setChoice(event) {
    this.setFrameFilter(event.target.value)
  }
}
