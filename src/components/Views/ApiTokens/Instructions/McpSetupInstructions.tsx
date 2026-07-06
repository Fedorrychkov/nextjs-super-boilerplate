'use client'

import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import { API_TOKEN_BRAND, API_TOKEN_PREFIX } from '~/api/api-token'
import { Typography } from '~/components/ui'
import { Button } from '~/components/ui/button'
import { useT } from '~/providers'
import { useApiTokenPermissionsQuery } from '~/query/api-token'

const MCP_SERVER_KEY = `${API_TOKEN_BRAND}-mcp`

/** Remote config — the primary PAT flow: URL + token, no repo checkout needed. */
const buildRemoteConfig = (origin: string) =>
  JSON.stringify(
    {
      mcpServers: {
        [MCP_SERVER_KEY]: {
          url: `${origin || 'https://your-site.com'}/api/mcp`,
          headers: {
            Authorization: `Bearer ${API_TOKEN_PREFIX}…`,
          },
        },
      },
    },
    null,
    2,
  )

/**
 * Legacy bridge config for stdio-only hosts without the OAuth layer. The header goes through an
 * env var to dodge a known Claude Desktop bug that splits args containing spaces.
 */
const buildBridgeConfig = (origin: string) =>
  JSON.stringify(
    {
      mcpServers: {
        [MCP_SERVER_KEY]: {
          command: 'npx',
          args: ['-y', 'mcp-remote', `${origin || 'https://your-site.com'}/api/mcp`, '--header', 'Authorization:${AUTH_HEADER}'],
          env: {
            AUTH_HEADER: `Bearer ${API_TOKEN_PREFIX}…`,
          },
        },
      },
    },
    null,
    2,
  )

const CopyButton = ({ value, label, copiedLabel }: { value: string; label: string; copiedLabel: string }) => {
  const [isCopied, setIsCopied] = useState(false)

  return (
    <div className="flex flex-row gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(value)
          setIsCopied(true)
        }}
      >
        {isCopied ? copiedLabel : label}
      </Button>
    </div>
  )
}

/**
 * Setup guide shown on the token pages (admin + user), two flows:
 *
 * 1. OAuth (when `MCP_OAUTH_ENABLED`) — Claude.ai / Claude Desktop / mobile / Cowork custom
 *    connectors and Claude Code: just the `/api/mcp` URL, login + consent happen in the browser,
 *    no token to copy and no Node.js required.
 * 2. PAT — hosts with native remote MCP + headers (Cursor, Codex, Claude Code) and the Messages
 *    API MCP connector; the legacy `mcp-remote` bridge covers stdio-only hosts without OAuth.
 */
export const McpSetupInstructions = ({ isAdmin = false }: { isAdmin?: boolean }) => {
  const t = useT()

  const [isOpen, setIsOpen] = useState(false)

  const { data: permissions } = useApiTokenPermissionsQuery()
  // Each section is shown only when the server supports it AND the caller's role policy allows the channel.
  const isOauthEnabled = Boolean(permissions?.mcpOauthEnabled) && (permissions?.allowedKinds ?? []).includes('oauth')
  const isPatAllowed = !permissions || (permissions.allowedKinds ?? []).includes('pat')

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const mcpUrl = `${origin || 'https://your-site.com'}/api/mcp`
  const config = useMemo(() => buildRemoteConfig(origin), [origin])
  const bridgeConfig = useMemo(() => buildBridgeConfig(origin), [origin])
  const claudeCodeCommand = `claude mcp add --transport http ${MCP_SERVER_KEY} ${mcpUrl}`

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4 md:mx-8 mx-1">
      <button type="button" className="flex flex-row items-center gap-2 text-left" onClick={() => setIsOpen((v) => !v)}>
        {isOpen ? <ChevronDownIcon width={16} height={16} /> : <ChevronRightIcon width={16} height={16} />}
        <Typography variant="Body/M/Semibold">{t('apiTokens.instructions.title')}</Typography>
      </button>

      {isOpen && (
        <div className="flex flex-col gap-3">
          <Typography variant="Body/S/Regular" className="text-muted-foreground">
            {t('apiTokens.instructions.intro')}
          </Typography>

          {isOauthEnabled && (
            <>
              <Typography variant="Body/S/Semibold">{t('apiTokens.instructions.oauthTitle')}</Typography>
              <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                {t('apiTokens.instructions.oauthHint')}
              </Typography>

              <pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto font-mono">{mcpUrl}</pre>

              <CopyButton value={mcpUrl} label={t('apiTokens.instructions.copyUrl')} copiedLabel={t('apiTokens.copied')} />

              <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                {t('apiTokens.instructions.oauthClaudeCodeHint')}
              </Typography>

              <pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto font-mono">{claudeCodeCommand}</pre>

              <CopyButton value={claudeCodeCommand} label={t('apiTokens.instructions.copyCommand')} copiedLabel={t('apiTokens.copied')} />
            </>
          )}

          {isPatAllowed && (
            <>
              <Typography variant="Body/S/Semibold">{t('apiTokens.instructions.patTitle')}</Typography>

              <ol className="flex flex-col gap-1 list-decimal pl-5">
                <li>
                  <Typography variant="Body/S/Regular">{t('apiTokens.instructions.step1')}</Typography>
                </li>
                <li>
                  <Typography variant="Body/S/Regular">{t('apiTokens.instructions.step2')}</Typography>
                </li>
                <li>
                  <Typography variant="Body/S/Regular">{t('apiTokens.instructions.step3')}</Typography>
                </li>
              </ol>

              <Typography variant="Body/S/Semibold">{t('apiTokens.instructions.configTitle')}</Typography>
              <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                {t('apiTokens.instructions.configHint')}
              </Typography>

              <pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto font-mono">{config}</pre>

              <CopyButton value={config} label={t('apiTokens.instructions.copyConfig')} copiedLabel={t('apiTokens.copied')} />

              <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                {isOauthEnabled ? t('apiTokens.instructions.bridgeHintLegacy') : t('apiTokens.instructions.bridgeHint')}
              </Typography>

              <pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto font-mono">{bridgeConfig}</pre>

              <CopyButton value={bridgeConfig} label={t('apiTokens.instructions.copyConfig')} copiedLabel={t('apiTokens.copied')} />
            </>
          )}

          {isAdmin && (
            <Typography variant="Body/XS/Regular" className="text-muted-foreground">
              {t('apiTokens.instructions.adminHint')}
            </Typography>
          )}
        </div>
      )}
    </div>
  )
}
