import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Icon, { ICON_NAMES } from '@/shared/components/Icon.vue'

describe('Icon', () => {
  it('renders an <svg> for a known name with default size 18', () => {
    const wrapper = mount(Icon, { props: { name: 'edit' as const } })
    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
    expect(svg.attributes('width')).toBe('18')
    expect(svg.attributes('height')).toBe('18')
    expect(svg.attributes('viewBox')).toBe('0 0 24 24')
    expect(svg.find('path').exists()).toBe(true)
  })

  it('respects the size prop', () => {
    const wrapper = mount(Icon, { props: { name: 'trash' as const, size: 24 } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('width')).toBe('24')
    expect(svg.attributes('height')).toBe('24')
  })

  it('renders distinct paths for distinct names', () => {
    const editPath = mount(Icon, { props: { name: 'edit' as const } }).find('path').attributes('d')
    const trashPath = mount(Icon, { props: { name: 'trash' as const } }).find('path').attributes('d')
    expect(editPath).toBeTruthy()
    expect(trashPath).toBeTruthy()
    expect(editPath).not.toBe(trashPath)
  })

  it.each([...ICON_NAMES])('renders an svg with non-empty body for %s', (name) => {
    const wrapper = mount(Icon, { props: { name } })
    const svg = wrapper.find('svg')
    expect(svg.exists()).toBe(true)
    // Each icon must render at least one drawing primitive (path/circle/rect)
    const primitives = svg.findAll('path, circle, rect')
    expect(primitives.length).toBeGreaterThan(0)
  })
})
