import { DeduplicatedNode, TestProgress } from '../types/subscription';

export interface SpeedTestOptions {
  timeoutMs?: number;
  concurrency?: number;
  onProgress?: (progress: TestProgress, updatedNode: DeduplicatedNode) => void;
}

// Single node browser-local network latency probe
export async function testSingleNodeLatency(
  node: DeduplicatedNode,
  timeoutMs: number = 3500
): Promise<{ latency: number | null; status: DeduplicatedNode['status']; errorMsg?: string }> {
  const primary = node.primaryNode;
  const server = primary.server;
  const port = primary.port;
  const isTls = primary.tls || port === 443 || port === 8443;
  const scheme = isTls ? 'https' : 'http';

  // Build target URL for fetch probe
  let probeUrl = `${scheme}://${server}:${port}/generate_204`;
  if (primary.sni) {
    probeUrl = `https://${primary.sni}:${port}/generate_204`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const startTime = performance.now();

  try {
    // Perform browser fetch with no-cors to test TCP/TLS connection RTT
    await fetch(probeUrl, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    });

    clearTimeout(timer);
    const latency = Math.round(performance.now() - startTime);
    return { latency, status: 'ok' };
  } catch (err: any) {
    clearTimeout(timer);
    const elapsed = Math.round(performance.now() - startTime);

    if (err.name === 'AbortError' || elapsed >= timeoutMs - 50) {
      return { latency: null, status: 'timeout', errorMsg: '连接超时' };
    }

    // In browser fetch, CORS or SSL handshake error still indicates TCP connectivity!
    // If the elapsed time is less than timeout, TCP connection succeeded before CORS/SSL blocked it.
    if (elapsed < timeoutMs) {
      return { latency: Math.max(1, elapsed), status: 'ok' };
    }

    return { latency: null, status: 'error', errorMsg: err.message || '网络连接失败' };
  }
}

// Parallel batch speed tester
export async function runParallelSpeedTest(
  nodes: DeduplicatedNode[],
  options: SpeedTestOptions = {}
): Promise<Map<string, DeduplicatedNode>> {
  const timeoutMs = options.timeoutMs || 3000;
  const concurrency = options.concurrency || 20;

  const resultsMap = new Map<string, DeduplicatedNode>();
  const queue = [...nodes];

  let completed = 0;
  let success = 0;
  let timeout = 0;
  let errorCount = 0;
  let totalLatency = 0;

  const updateProgress = (updatedNode: DeduplicatedNode) => {
    if (options.onProgress) {
      const avgLatency = success > 0 ? Math.round(totalLatency / success) : 0;
      options.onProgress(
        {
          total: nodes.length,
          completed,
          testing: nodes.length - completed,
          success,
          timeout,
          error: errorCount,
          avgLatency,
          isRunning: completed < nodes.length
        },
        updatedNode
      );
    }
  };

  // Helper for executing worker pool
  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      // Mark node as testing
      const testingNode: DeduplicatedNode = {
        ...item,
        status: 'testing'
      };
      resultsMap.set(item.fingerprint, testingNode);
      updateProgress(testingNode);

      // Execute probe
      const res = await testSingleNodeLatency(item, timeoutMs);

      completed++;
      if (res.status === 'ok' && res.latency !== null) {
        success++;
        totalLatency += res.latency;
      } else if (res.status === 'timeout') {
        timeout++;
      } else {
        errorCount++;
      }

      const finalNode: DeduplicatedNode = {
        ...item,
        latency: res.latency,
        status: res.status,
        errorMsg: res.errorMsg,
        lastTested: Date.now()
      };

      resultsMap.set(item.fingerprint, finalNode);
      updateProgress(finalNode);
    }
  };

  const pool = Array.from({ length: Math.min(concurrency, nodes.length) }, () => worker());
  await Promise.all(pool);

  return resultsMap;
}
