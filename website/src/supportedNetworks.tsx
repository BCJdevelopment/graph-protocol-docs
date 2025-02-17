import { CodeInline, Paragraph, Table } from '@graphprotocol/nextra-theme'
import { ExecutionResult } from 'graphql'

import { ChainProductStatus, SupportedNetworkMap } from '@edgeandnode/common'

import { execute, SupportedNetworksDocument, SupportedNetworksQuery } from '@/.graphclient'
import { useI18n } from '@/i18n'

export async function getSupportedNetworks() {
  // Get the IDs of the networks that are fully supported (as opposed to supported only by the upgrade indexer) using the EBO subgraph
  const supportedNetworksQueryResult: ExecutionResult<SupportedNetworksQuery> = await execute(SupportedNetworksDocument)
  const fullySupportedNetworkIds = (supportedNetworksQueryResult.data?.networks ?? []).map((network) => network.id)

  // Fallback in case the GraphQL query fails (last updated 2023-12-14)
  if (fullySupportedNetworkIds.length === 0) {
    fullySupportedNetworkIds.push(
      'eip155:1',
      'eip155:100',
      'eip155:137',
      'eip155:250',
      'eip155:42161',
      'eip155:42220',
      'eip155:43114',
    )
  }

  return Array.from(SupportedNetworkMap.values()).flatMap((network) =>
    Array.from(network.chains)
      .map((chain) => {
        const supportedOnHostedService = chain.productDeployStatus.hostedService === ChainProductStatus.ALLOWED
        const supportedOnStudio = chain.productDeployStatus.studio === ChainProductStatus.ALLOWED

        if (!chain.graphCliName || (!supportedOnStudio && !supportedOnHostedService)) {
          return null as never // `as never` to work around the `.filter(Boolean)` below not narrowing the type
        }

        const fullySupportedOnNetwork =
          network.id === 'evm' && fullySupportedNetworkIds.includes(`eip155:${chain.chainId}`)
        const partiallySupportedOnNetwork = network.id === 'evm' && !fullySupportedOnNetwork

        return {
          uid: chain.uid,
          name: chain.name,
          cliName: chain.graphCliName,
          chainId: chain.chainId,
          testnet: chain.testnet,
          supportedOnHostedService,
          supportedOnStudio,
          fullySupportedOnNetwork,
          partiallySupportedOnNetwork,
          substreams: chain.substreams ?? [],
        }
      })
      .filter(Boolean),
  )
}

export function SupportedNetworksTable({ networks }: { networks: Awaited<ReturnType<typeof getSupportedNetworks>> }) {
  const { t } = useI18n()

  return (
    <Table>
      <tbody>
        <tr>
          <th>{t('supportedNetworks.network')}</th>
          <th>{t('supportedNetworks.cliName')}</th>
          <th align="center">{t('supportedNetworks.chainId')}</th>
          <th align="center">{t('supportedNetworks.hostedService')}</th>
          <th align="center">{t('supportedNetworks.subgraphStudio')}</th>
          <th align="center">{t('supportedNetworks.decentralizedNetwork')}</th>
        </tr>
        {networks.map((network) => (
          <tr key={network.cliName}>
            <td>{network.name}</td>
            <td>
              <CodeInline>{network.cliName}</CodeInline>
            </td>
            <td align="center">{network.chainId}</td>
            <td align="center">{network.supportedOnHostedService ? '✓' : null}</td>
            <td align="center">
              {network.supportedOnStudio ? '✓' : null}
              {network.substreams.includes('studio') ? <sup>†</sup> : null}
            </td>
            <td align="center">
              {network.fullySupportedOnNetwork ? '✓' : null}
              {network.partiallySupportedOnNetwork ? '*' : null}
              {network.substreams.includes('network') ? <sup>†</sup> : null}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
