import { VPNNode, DeduplicatedNode } from '../types/subscription';

export function deduplicateNodes(
  allNodes: VPNNode[],
  previousResultsMap: Map<string, { latency: number | null; status: DeduplicatedNode['status']; errorMsg?: string }> = new Map()
): DeduplicatedNode[] {
  const map = new Map<string, DeduplicatedNode>();

  allNodes.forEach((node) => {
    const prev = map.get(node.fingerprint);

    if (prev) {
      // Add subscription source if not already present
      if (!prev.sourceSubscriptions.some((s) => s.id === node.subscriptionId)) {
        prev.sourceSubscriptions.push({
          id: node.subscriptionId,
          name: node.subscriptionName
        });
      }
    } else {
      // Restore previous latency test result if available
      const testCache = previousResultsMap.get(node.fingerprint);

      map.set(node.fingerprint, {
        fingerprint: node.fingerprint,
        primaryNode: node,
        sourceSubscriptions: [{ id: node.subscriptionId, name: node.subscriptionName }],
        latency: testCache ? testCache.latency : null,
        status: testCache ? testCache.status : 'idle',
        errorMsg: testCache?.errorMsg
      });
    }
  });

  return Array.from(map.values());
}
