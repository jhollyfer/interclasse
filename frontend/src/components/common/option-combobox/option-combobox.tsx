import type * as React from 'react'

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '#/components/ui/combobox'
import { InputGroupAddon } from '#/components/ui/input-group'
import { cn } from '#/lib/utils'

export type OptionComboboxItem = {
  value: string
  label: string
  /** A classe de cor da bolinha do estado, quando o campo tem uma. */
  dot?: string
}

type OptionComboboxProps = {
  options: ReadonlyArray<OptionComboboxItem>
  /** O valor escolhido. `''` é "nada escolhido", como no resto dos formulários. */
  value: string | null | undefined
  onValueChange: (value: string) => void
  /** Vai no campo de busca: os formulários daqui validam em `onTouched`. */
  onBlur?: () => void
  id?: string
  placeholder?: string
  disabled?: boolean
  /** Mostra o × que limpa. Ligado no filtro, desligado no campo obrigatório. */
  clearable?: boolean
  /** Um ícone antes do valor, no mesmo lugar da bolinha de estado. */
  icon?: React.ReactNode
  'aria-invalid'?: boolean
  'aria-label'?: string
  className?: string
}

/**
 * O campo de escolher um valor de uma lista fechada.
 *
 * Uma peça só para as duas formas que existem no painel - o enum com mapa de
 * rótulos (status, categoria, papel) e a lista de entidade já carregada (álbum,
 * arquivo) -, porque as duas viram o mesmo `{ value, label }` e as duas
 * tropeçam nas mesmas duas coisas:
 *
 * **O `onBlur` não fica na raiz.** `{...field}` do React Hook Form não serve
 * aqui: o `onBlur` precisa ir no campo de busca, e é dele que o
 * `mode: 'onTouched'` depende para marcar o campo como tocado. Espalhar `field`
 * na raiz do `Combobox` perderia o evento em silêncio, e o erro do campo só
 * apareceria no submit.
 *
 * **`null` não é `''`.** O Base UI usa `null` para "nada escolhido"; os
 * formulários e os filtros guardam `''`. A conversão nas duas pontas mora aqui,
 * e não repetida em cada tela.
 *
 * A bolinha de cor é `InputGroupAddon`, e não um `span` posicionado por cima:
 * era assim no `NativeSelect` que esta peça substituiu, e junto com ela ia um
 * `[&>select]:pl-6` para abrir espaço no lugar certo.
 */
export function OptionCombobox({
  options,
  value,
  onValueChange,
  onBlur,
  id,
  placeholder = 'Selecione',
  disabled,
  clearable = false,
  icon,
  'aria-invalid': invalid,
  'aria-label': ariaLabel,
  className,
}: OptionComboboxProps): React.JSX.Element {
  // Sem `useMemo`: o React Compiler está ligado (`vite.config.ts`), e um
  // `find` sobre a lista de opções de um enum não é o tipo de custo que
  // justifica escrever a dependência à mão.
  const selected = options.find((option) => option.value === value) ?? null

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(option: OptionComboboxItem | null) =>
        onValueChange(option?.value ?? '')
      }
      itemToStringLabel={(option: OptionComboboxItem) => option.label}
      isItemEqualToValue={(
        option: OptionComboboxItem,
        current: OptionComboboxItem,
      ) => option.value === current.value}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid}
        aria-label={ariaLabel}
        showClear={clearable}
        className={cn('w-full', className)}
      >
        {(icon ?? selected?.dot) && (
          <InputGroupAddon align="inline-start">
            {icon}
            {!icon && selected?.dot && (
              <span
                aria-hidden="true"
                className={cn('size-2 rounded-full', selected.dot)}
              />
            )}
          </InputGroupAddon>
        )}
      </ComboboxInput>

      <ComboboxContent>
        <ComboboxEmpty>Nenhuma opção encontrada.</ComboboxEmpty>
        <ComboboxList>
          {(option: OptionComboboxItem) => (
            <ComboboxItem key={option.value} value={option}>
              {option.dot && (
                <span
                  aria-hidden="true"
                  className={cn('size-2 shrink-0 rounded-full', option.dot)}
                />
              )}
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

/**
 * O atalho para o caso mais comum: um enum e o mapa de rótulos que já existe em
 * `lib/labels`. Sem ele cada tela escreveria o mesmo `map` de três linhas.
 */
export function toOptions(
  values: ReadonlyArray<string>,
  labels: Record<string, string | undefined>,
  dots?: Record<string, string | undefined>,
): Array<OptionComboboxItem> {
  return values.map((value) => ({
    value,
    label: labels[value] ?? value,
    dot: dots?.[value],
  }))
}
