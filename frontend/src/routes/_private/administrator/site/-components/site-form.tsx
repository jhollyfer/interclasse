import type * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { FilePdfIcon } from '@phosphor-icons/react'

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
import { useSiteUpdate } from '#/integrations/tanstack-query/mutations'
import { siteQueryOptions } from '#/integrations/tanstack-query/queries'
import type { ISiteSetting } from '#/lib/interfaces'
import { SiteUpdateValidator } from '#/validators/administrator/site.validator'
import type { SiteUpdatePayload } from '#/validators/administrator/site.validator'

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

/** Campo de texto vazio vai como `null`: apaga, em vez de gravar `''`. */
function textOrNull(value: string): string | null {
  if (value.trim() === '') return null

  return value
}

/** Campo numérico vazio (`NaN`) vai como `null`. */
function numberOrNull(value: number): number | null {
  if (Number.isNaN(value)) return null

  return value
}

/** O registro como o formulário o edita: tudo o que o PUT aceita. */
function valuesOf(site: ISiteSetting): SiteUpdatePayload {
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
    SiteUpdatePayload,
    ISiteSetting,
    SiteUpdatePayload
  >({
    validator: SiteUpdateValidator,
    values: valuesOf(site),
    fields: SITE_FIELDS,
    mutation: useSiteUpdate,
    invalidate: [queryKeys.administrator.site, ...DEPENDENTS.site],
    success: 'Site atualizado.',
    retry: 'site-update',
    payload: (values) => values,
  })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader>
        <PageHeaderTitle>Site</PageHeaderTitle>
        <PageHeaderDescription>
          O que aparece em &quot;Sobre os jogos&quot; e no rodapé do site, e o
          regulamento para baixar. Campo vazio não aparece no site.
        </PageHeaderDescription>
      </PageHeader>

      <form method="post" className="flex flex-col gap-4" onSubmit={onSubmit}>
        <AppFormRootError form={form} />

        <Card>
          <CardHeader>
            <CardTitle>Sobre os jogos</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <AppField
                control={form.control}
                name="about"
                id="site-about"
                label="O que são os jogos"
              >
                {({ field, control }) => (
                  <Textarea
                    {...control}
                    rows={6}
                    maxLength={4000}
                    value={field.value ?? ''}
                    onChange={(event) =>
                      field.onChange(textOrNull(event.target.value))
                    }
                    onBlur={field.onBlur}
                  />
                )}
              </AppField>
              <AppField
                control={form.control}
                name="organizer"
                id="site-organizer"
                label="Quem criou e organiza"
              >
                {({ field, control }) => (
                  <Input
                    {...control}
                    maxLength={160}
                    value={field.value ?? ''}
                    onChange={(event) =>
                      field.onChange(textOrNull(event.target.value))
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
                  label="Edição atual"
                >
                  {({ field, control }) => (
                    <Input
                      {...control}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={field.value ?? ''}
                      onChange={(event) =>
                        field.onChange(numberOrNull(event.target.valueAsNumber))
                      }
                      onBlur={field.onBlur}
                    />
                  )}
                </AppField>
                <AppField
                  control={form.control}
                  name="firstEditionYear"
                  id="site-first-edition"
                  label="Ano da primeira edição"
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
                        field.onChange(numberOrNull(event.target.valueAsNumber))
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
            <CardTitle>Instagram</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <AppField
                control={form.control}
                name="schoolInstagram"
                id="site-school-instagram"
                label="Da escola (sem @)"
              >
                {({ field, control }) => (
                  <Input
                    {...control}
                    maxLength={30}
                    placeholder="cmei_cosmejean"
                    value={field.value ?? ''}
                    onChange={(event) =>
                      field.onChange(textOrNull(event.target.value))
                    }
                    onBlur={field.onBlur}
                  />
                )}
              </AppField>
              <AppField
                control={form.control}
                name="developerInstagram"
                id="site-developer-instagram"
                label="De quem desenvolveu o site (sem @)"
              >
                {({ field, control }) => (
                  <Input
                    {...control}
                    maxLength={30}
                    value={field.value ?? ''}
                    onChange={(event) =>
                      field.onChange(textOrNull(event.target.value))
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
            <CardTitle>Regulamento</CardTitle>
          </CardHeader>
          <CardContent>
            <AppField
              control={form.control}
              name="regulationId"
              id="site-regulation"
              label="Arquivo em PDF"
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
                      <ImageFieldUpload>Enviar PDF</ImageFieldUpload>
                      <ImageFieldRemove />
                    </ImageFieldActions>
                    <ImageFieldDescription />
                  </ImageFieldContent>
                </ImageField>
              )}
            </AppField>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            Salvar
          </Button>
        </div>
      </form>
    </div>
  )
}
