import proxyAddr from 'proxy-addr'

type TrustFunction = (address: string, distance: number) => boolean

/**
 * `TRUSTED_PROXIES` (`loopback,uniquelocal`) turned into the function Adonis hands to
 * `request.ip()`.
 *
 * Why not pass the string through: proxy-addr does not split on commas, so the documented
 * production value is read as one invalid address and `request.ip()` throws on every
 * request. The list is split here and compiled once at boot, so a bad value brings the
 * boot down instead of the first request (_doc-lib/adonisjs.md#guides/basics/request,
 * https://docs.adonisjs.com/guides/basics/request).
 *
 * Absent means `loopback` (`_standards/backend.md` §6.2): right with no proxy in front.
 *
 * "Trust everyone" is refused on purpose (`true`, `*`, the catch-all ranges): then the client
 * writes `X-Forwarded-For` itself and picks its own rate-limit bucket.
 */
export class TrustedProxies {
  private static readonly TRUST_EVERYONE = new Set([
    'true',
    '*',
    '0.0.0.0/0',
    '::/0',
  ])
  private static readonly ABSENT = 'loopback'

  static compile(raw: string | undefined): TrustFunction {
    const entries = TrustedProxies.entries(raw ?? TrustedProxies.ABSENT)

    try {
      return proxyAddr.compile(entries)
    } catch (cause) {
      throw new Error('TRUSTED_PROXIES has an invalid entry', { cause })
    }
  }

  /**
   * The env schema validator: an invalid value fails the boot, and the raw string (or its
   * absence) is what `config/app.ts` reads.
   */
  static readonly validate = (
    _key: string,
    value: string | undefined,
  ): string | undefined => {
    if (value === undefined) return undefined

    TrustedProxies.compile(value)

    return value
  }

  private static entries(raw: string): string[] {
    const entries = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)

    if (entries.length === 0)
      throw new Error('TRUSTED_PROXIES needs at least one entry')

    const everyone = entries.find((entry) =>
      TrustedProxies.TRUST_EVERYONE.has(entry.toLowerCase()),
    )

    if (everyone !== undefined) {
      throw new Error(`TRUSTED_PROXIES must not trust everyone (${everyone})`)
    }

    return entries
  }
}
