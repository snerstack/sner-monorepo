import { fireEvent, screen } from '@testing-library/react'
import { expect, vi } from 'vitest'

import { httpClient } from '@/lib/httpClient'

export const testAnnotate = ({ tagsId, commentId }: { tagsId: string; commentId: string }) => {
  const tagsCell = screen.getAllByTestId(tagsId)[0]
  const tagsCellEmptyComment = screen.getAllByTestId(tagsId)[1]
  const commentCell = screen.getAllByTestId(commentId)[0]
  const commentCellEmptyComment = screen.getAllByTestId(commentId)[1]

  vi.spyOn(httpClient, 'post').mockResolvedValue('')

  // tests tags input, default tags, comment input
  fireEvent.doubleClick(tagsCell)
  expect(screen.getByText('Annotate')).toBeInTheDocument()
  const tagsInput = screen.getByTestId('tags-field').querySelector('input')!
  const defaultTags = screen.getByTestId('default-tags')
  const commentInput = screen.getByLabelText('Comment')
  fireEvent.change(tagsInput, { target: { value: 'new_tag' } })
  fireEvent.keyDown(tagsInput, { key: 'Enter', code: 13, charCode: 13 })
  fireEvent.click(defaultTags.children[0])
  fireEvent.change(commentInput, { target: { value: 'new_comment' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  // tests closing modal without saving
  fireEvent.doubleClick(tagsCellEmptyComment)
  expect(screen.getByText('Annotate')).toBeInTheDocument()
  const modalBackground = screen.getByTestId('annotate-modal').parentElement!
  fireEvent.click(modalBackground)

  fireEvent.doubleClick(commentCell)
  expect(screen.getByText('Annotate')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  fireEvent.doubleClick(commentCellEmptyComment)
  expect(screen.getByText('Annotate')).toBeInTheDocument()
}
