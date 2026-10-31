import type { Merge } from '@interclasse/shared'
import type * as React from 'react'

import { useIsUploading } from '#/components/common/uploading-context'
import { Button } from '#/components/ui/button'
import { Spinner } from '#/components/ui/spinner'

type SubmitButtonProps = Readonly<
  Merge<
    Omit<React.ComponentProps<typeof Button>, 'isPending' | 'children'>,
    {
      /** Is the mutation in flight? Shows the spinner and locks the button. */
      isPending?: boolean
      children: React.ReactNode
    }
  >
>

/**
 * The save button for every dashboard form.
 *
 * It exists for a single reason: it locks itself while an **upload** is in
 * progress. The attachment is uploaded when the file is chosen, and the form only knows
 * the `id` after the file exists - saving in the middle sends a payload without the
 * attachment, and the record is born without an image, with no error to give it away.
 *
 * A component and not two lines on each screen because there is one form per
 * resource - news, event, podcast, video, album, testimonial, user -, and
 * two lines repeated seven times are seven chances to forget on an eighth.
 */
export function SubmitButton({
  isPending,
  disabled,
  children,
  ...props
}: SubmitButtonProps): React.JSX.Element {
  const isUploading = useIsUploading()

  return (
    <Button
      type="submit"
      disabled={disabled || isPending || isUploading}
      {...props}
    >
      {isPending && <Spinner className="size-4" />}
      {children}
    </Button>
  )
}
