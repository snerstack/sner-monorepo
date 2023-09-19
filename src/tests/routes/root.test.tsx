import RootPage from '@/routes/root'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('Home page', () => {
  it('shows home page', () => {
    render(<RootPage />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Slow Network Recon Service')
  })
})
