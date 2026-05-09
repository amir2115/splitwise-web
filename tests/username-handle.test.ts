import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UsernameHandle from '@/shared/components/UsernameHandle.vue'

describe('UsernameHandle', () => {
  it('renders @username inside a <bdi> element', () => {
    const wrapper = mount(UsernameHandle, { props: { username: 'amir2115' } })
    const bdi = wrapper.find('bdi')
    expect(bdi.exists()).toBe(true)
    expect(bdi.text()).toBe('@amir2115')
  })

  it('passes special characters through without transformation', () => {
    const wrapper = mount(UsernameHandle, { props: { username: 'foo_bar.baz' } })
    expect(wrapper.find('bdi').text()).toBe('@foo_bar.baz')
  })

  it('uses <bdi> as the root element (not a wrapper)', () => {
    const wrapper = mount(UsernameHandle, { props: { username: 'amir' } })
    expect(wrapper.element.tagName.toLowerCase()).toBe('bdi')
  })

  it('places @ before the username in template output', () => {
    const wrapper = mount(UsernameHandle, { props: { username: 'zzz' } })
    expect(wrapper.find('bdi').html()).toMatch(/^<bdi[^>]*>@zzz<\/bdi>$/)
  })
})
