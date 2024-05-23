import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Mock, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '@/tests/utils/renderWithProviders'

import QuickJump from '@/components/QuickJump'

const useNavigateMock: Mock = vi.fn()

const mockNavigate = () => {
  vi.mock('react-router-dom', async (): Promise<unknown> => {
    const actual: Record<string, unknown> = await vi.importActual('react-router-dom')
    return {
      ...actual,
      useNavigate: (): Mock => useNavigateMock,
    }
  })
}

const testQuickJump = async (typedIn: string, elemText: string) => {
  mockNavigate()
  renderWithProviders({ element: <QuickJump />, path: '/' })
  const input = screen.getByPlaceholderText('Quick jump')
  expect(input).toBeInTheDocument()
  fireEvent.change(input, { target: { value: typedIn } })

  await waitFor(() => {
    const dummyHostElement = screen.getByText(elemText)
    expect(dummyHostElement).toBeInTheDocument()
    fireEvent.click(dummyHostElement)
  })

  await waitFor(() => {
    expect(useNavigateMock).toBeCalled()
  })
}

describe('QuickJump component', () => {
  it('renders component', () => {
    renderWithProviders({ element: <QuickJump />, path: '/' })
    const input = screen.getByPlaceholderText('Quick jump')
    expect(input).toBeInTheDocument()
  })

  it('jumps to ip', async () => {
    await testQuickJump('ip:dummy', 'dummy')
  })

  it('jumps to filtered service list', async () => {
    await testQuickJump('port:11', '11')
  })

  it('jumps host by hostname', async () => {
    await testQuickJump('dummy', 'dummy')
  })
})
