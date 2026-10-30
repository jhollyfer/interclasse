import { AdministratorSiteUpdateValidator } from '@interclasse/shared'
import type {
  AdministratorSiteUpdatePayload,
  AdministratorSiteShowResponse,
} from '@interclasse/shared'
import { FilePdfIcon } from '@phosphor-icons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import type * as React from 'react'

import {
  ImageField,
  ImageFieldActions,
  ImageFieldContent,
  ImageFieldDescription,
  ImageFieldRemove,
  ImageFieldUpload,
} from '#/components/common/image-field'
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '#/components/common/page-shell'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { FieldGroup } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { DEPENDENTS, queryKeys } from '#/hooks/tanstack-query/_query-keys'
import { useMutationForm } from '#/hooks/use-mutation-form'
import {
  AppField,
  AppFormRootError,
} from '#/integrations/react-hook-form/app-field'
import { useSiteUpdateMutation } from '#/integrations/tanstack-query/mutations/administrator'
import { siteQueryOptions } from '#/integrations/tanstack-query/queries/administrator'
import { blankToNull, nanToNull } from '#/lib/form-values'
import { m } from '#/paraglide/messages'

const SITE_FIELDS = [
  'about',
  'organizer',
  'firstEditionYear',
  'edition',
  'schoolInstagram',
  'developerInstagram',
  'regulationId',
] as const

/** Só PDF: o regulamento é para baixar e imprimir. */
const PDF = ['application/pdf'] as const

/** O registro como o formulário o edita: tudo o que o PUT aceita. */
function valuesOf(
  site: AdministratorSiteShowResponse,
): AdministratorSiteUpdatePayload {
  return {
    about: site.about,
    organizer: site.organizer,
    firstEditionYear: site.firstEditionYear,
    edition: site.edition,
    schoolInstagram: site.schoolInstagram,
    developerInstagram: site.developerInstagram,
    regulationId: site.regulationId,
  }
}

/**
 * O que o site mostra sobre os jogos e que só a organização sabe. Uma tela
 * só, sem lista: a configuração é uma.
 */
export function SiteForm(): React.JSX.Element {
  const { data: site } = useSuspenseQuery(siteQueryOptions())

  const { form, mutation, onSubmit } = useMutationForm<
    AdministratorSiteUpdatePayload,
    AdministratorSiteShowResponse,
    AdministratorSiteUpdatePayload
  >({
    validator: AdministratorSiteUpdateValidator,
    values: valuesOf(site),
    fields: SITE_FIELDS,
    mutation: useSiteUpdateMutation,
    invalidate: [queryKeys.administrator.site, ...DEPENDENTS.site],
    success: m.admin_site_updated(),
    retry: 'site-update',
    payload: (values) => values,
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>{m.admin_site_title()}</PageHeaderTitle>
        <PageHeaderDescription>
          {m.admin_site_description()}
        </PageHeaderDescription>
      </PageHeader>

      <form method="post" className="flex flex-col gap-4" onSubmit={onSubmit}>
        <AppFormRootError form={form} />

        <Card>
          <CardHeader>
            <CardTitle>{m.admin_site_about_card()}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <AppField
                control={form.control}
                name="about"
                id="site-about"
                label={m.admin_site_field_about()}
              >
                {({ field, control }) => (
                  <Textarea
                    {...control}
                    rows={6}
                    maxLength={4000}
                    value={field.value ?? ''}
                    onChange={(event) =>
                      field.onChange(blankToNull(event.target.value))
                    }
                    onBlur={field.onBlur}
                  />
                )}
              </AppField>
              <AppField
                control={form.control}
                name="organizer"
                id="site-organizer"
                label={m.admin_site_field_organizer()}
              >
                {({ field, control }) => (
                  <Input
                    {...control}
                    maxLength={160}
                    value={field.value ?? ''}
                    onChange={(event) =>
                      field.onChange(blankToNull(event.target.value))
                    }
                    onBlur={field.onBlur}
                  />
                )}
              </AppField>
              <div className="grid gap-4 sm:grid-cols-2">
                <AppField
                  control={form.control}
                  name="edition"
                  id="site-edition"
                  label={m.admin_site_field_edition()}
                >
                  {({ field, control }) => (
                    <Input
                      {...control}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={field.value ?? ''}
                      onChange={(event) =>
                        field.onChange(nanToNull(event.target.valueAsNumber))
                      }
                      onBlur={field.onBlur}
                    />
                  )}
                </AppField>
                <AppField
                  control={form.control}
                  name="firstEditionYear"
                  id="site-first-edition"
                  label={m.admin_site_field_first_edition()}
                >
                  {({ field, control }) => (
                    <Input
                      {...control}
                      type="number"
                      inputMode="numeric"
                      min={1990}
                      max={2100}
                      value={field.value ?? ''}
                      onChange={(event) =>
                        field.onChange(nanToNull(event.target.valueAsNumber))
                      }
                      onBlur={field.onBlur}
                    />
                  )}
                </AppField>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{m.admin_site_instagram_card()}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <AppField
                control={form.control}
                name="schoolInstagram"
                id="site-school-instagram"
                label={m.admin_site_field_school_instagram()}
              >
                {({ field, control }) => (
                  <Input
                    {...control}
                    maxLength={30}
                    placeholder="cmei_cosmejean"
                    value={field.value ?? ''}
                    onChange={(event) =>
                      field.onChange(blankToNull(event.target.value))
                    }
                    onBlur={field.onBlur}
                  />
                )}
              </AppField>
              <AppField
                control={form.control}
                name="developerInstagram"
                id="site-developer-instagram"
                label={m.admin_site_field_developer_instagram()}
              >
                {({ field, control }) => (
                  <Input
                    {...control}
                    maxLength={30}
                    value={field.value ?? ''}
                    onChange={(event) =>
                      field.onChange(blankToNull(event.target.value))
                    }
                    onBlur={field.onBlur}
                  />
                )}
              </AppField>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{m.admin_site_regulation_card()}</CardTitle>
          </CardHeader>
          <CardContent>
            <AppField
              control={form.control}
              name="regulationId"
              id="site-regulation"
              label={m.admin_site_field_regulation()}
            >
              {({ field, control }) => (
                <ImageField
                  id={control.id}
                  accept={PDF}
                  value={field.value ?? null}
                  onValueChange={field.onChange}
                >
                  <ImageFieldContent>
                    {site.regulation && field.value === site.regulationId && (
                      <a
                        href={site.regulation.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary flex items-center gap-2 text-sm font-medium hover:underline"
                      >
                        <FilePdfIcon className="size-5" />
                        {site.regulation.originalName}
                      </a>
                    )}
                    <ImageFieldActions>
                      <ImageFieldUpload>
                        {m.admin_site_upload_pdf()}
                      </ImageFieldUpload>
                      <ImageFieldRemove />
                    </ImageFieldActions>
                    <ImageFieldDescription>
                      {m.admin_site_pdf_only()}
                    </ImageFieldDescription>
                  </ImageFieldContent>
                </ImageField>
              )}
            </AppField>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {m.admin_common_save()}
          </Button>
        </div>
      </form>
    </div>
  )
}
