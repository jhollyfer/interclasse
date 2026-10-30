import type { Page } from '@playwright/test'

/**
 * O app é renderizado no servidor: o HTML chega antes de o React assumir. O que
 * o teste digita nessa janela é apagado quando a hidratação termina (campo
 * controlado volta a vazio), e um clique cai no envio nativo do formulário.
 *
 * O React 19 grava `__reactProps$...` no elemento que hidratou; é o sinal que o
 * DOM expõe. Olha a página toda, e não só o `main`: página de texto (Sobre) não
 * tem link nem botão ali, mas o cabeçalho hidrata junto. Sem `waitForTimeout` e sem `networkidle` (que o lint reprova).
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('a, button, input')).some((element) =>
      Object.keys(element).some((key) => key.startsWith('__reactProps')),
    ),
  )
}
