import { LitElement, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import tailwindStyles from '../shared/tailwind-styles'

@customElement('person-check-in')
export class PersonCheckIn extends LitElement {
  static styles = tailwindStyles

  @property({type: String}) query = ''

  render() {
    return html`
      <input .value=${this.query} placeholder="name..." type="text" class="block w-full border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm" id="name" />
    `
  }
}

