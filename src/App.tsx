import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { ProgressBar } from './components/ProgressBar';
import { NodeGrid } from './components/NodeGrid';
import { SubscriptionModal } from './components/SubscriptionModal';
import { BestNodeSelector } from './components/BestNodeSelector';
import { OnboardingModal } from './components/OnboardingModal';
import { DocumentationModal } from './components/DocumentationModal';
import { Subscription, VPNNode, DeduplicatedNode, TestProgress, FilterOptions } from './types/subscription';
import {
  getStoredSubscriptions,
  saveSubscriptions,
  loadSubscriptionsFromApi,
  getStoredLatencyCache,
  saveLatencyCache,
  fetchSubscriptionContent
} from './utils/storage';
import { parseSubscriptionContent, isInformationalNode } from './utils/parser';
import { deduplicateNodes } from './utils/deduplicator';
import { runParallelSpeedTest, testSingleNodeLatency } from './utils/speedTest';
import { fetchIPGeo, getCachedGeoMap, detectLocationMismatch } from './utils/geo';

export function App() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(getStoredSubscriptions);
  const [rawNodes, setRawNodes] = useState<VPNNode[]>([]);
  const [testResults, setTestResults] = useState<Map<string, DeduplicatedNode>>(new Map());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isDocOpen, setIsDocOpen] = useState(false);

  // Auto-trigger Onboarding tour for first-time visitors
  useEffect(() => {
    const hasSeen = localStorage.getItem('subpulse_onboarding_seen');
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setIsOnboardingOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const [testProgress, setTestProgress] = useState<TestProgress>({
    total: 0,
    completed: 0,
    testing: 0,
    success: 0,
    timeout: 0,
    error: 0,
    avgLatency: 0,
    isRunning: false
  });

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    search: '',
    subscriptionId: 'all',
    protocol: 'all',
    deduplicate: true,
    status: 'all',
    sortBy: 'latency',
    sortOrder: 'asc'
  });

  // Save subscriptions changes to storage
  useEffect(() => {
    saveSubscriptions(subscriptions);
  }, [subscriptions]);

  // Parallel Sync / pull remote subscription links content
  const syncSubscriptionsForList = useCallback(async (targetSubs: Subscription[]) => {
    if (targetSubs.length === 0) return;
    setIsSyncing(true);

    const fetchResults = await Promise.all(
      targetSubs.map(async (sub) => {
        if (!sub.enabled) {
          return { sub, parsedNodes: [] };
        }

        try {
          const content = await fetchSubscriptionContent(sub.url);
          const parsed = parseSubscriptionContent(content, sub.id, sub.name);

          return {
            sub: {
              ...sub,
              lastUpdated: Date.now(),
              nodeCount: parsed.length,
              error: null
            },
            parsedNodes: parsed
          };
        } catch (err: any) {
          return {
            sub: {
              ...sub,
              error: err.message || '拉取失败'
            },
            parsedNodes: []
          };
        }
      })
    );

    const updatedSubMap = new Map(fetchResults.map((r) => [r.sub.id, r.sub]));
    const fetchedIds = new Set(targetSubs.map((s) => s.id));
    const newFetchedNodes = fetchResults.flatMap((r) => r.parsedNodes);

    setSubscriptions((prev) =>
      prev.map((s) => updatedSubMap.get(s.id) || s)
    );

    setRawNodes((prev) => {
      const kept = prev.filter((n) => !fetchedIds.has(n.subscriptionId));
      return [...kept, ...newFetchedNodes];
    });

    setIsSyncing(false);
  }, []);

  const syncSubscriptions = useCallback(() => {
    setSubscriptions((latestSubs) => {
      syncSubscriptionsForList(latestSubs);
      return latestSubs;
    });
  }, [syncSubscriptionsForList]);

  // Ensure initial sync runs strictly once
  const initialSyncRef = React.useRef(false);

  // Auto-sync subscriptions on initial mount
  useEffect(() => {
    if (initialSyncRef.current) return;
    initialSyncRef.current = true;

    async function initData() {
      const apiSubs = await loadSubscriptionsFromApi();
      const subsToUse = (apiSubs && apiSubs.length > 0) ? apiSubs : subscriptions;
      if (apiSubs && apiSubs.length > 0) {
        setSubscriptions(apiSubs);
      }
      if (subsToUse.some((s) => s.enabled)) {
        syncSubscriptionsForList(subsToUse);
      }
    }
    initData();
  }, []);

  // Periodic background check for auto-update subscriptions (checks every 1 minute)
  useEffect(() => {
    const timer = setInterval(() => {
      setSubscriptions((latestSubs) => {
        const now = Date.now();
        const dueSubs = latestSubs.filter((sub) => {
          if (!sub.enabled || !sub.url) return false;
          const intervalMs = (sub.autoUpdateHours || 6) * 3600 * 1000;
          const lastUpdate = sub.lastUpdated || 0;
          return now - lastUpdate >= intervalMs;
        });

        if (dueSubs.length > 0) {
          syncSubscriptionsForList(dueSubs);
        }
        return latestSubs;
      });
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, [syncSubscriptionsForList]);

  // IP Geolocation state
  const [geoMap, setGeoMap] = useState<Record<string, any>>(() => getCachedGeoMap());
  const [isGeoTesting, setIsGeoTesting] = useState(false);
  const [geoProgress, setGeoProgress] = useState<{ total: number; completed: number; isRunning: boolean }>({
    total: 0,
    completed: 0,
    isRunning: false
  });

  // Compute deduplicated nodes combining raw nodes, latency test cache, and geo info
  const deduplicatedNodes = useMemo(() => {
    const cacheMap = getStoredLatencyCache();
    const map = new Map<string, { latency: number | null; status: DeduplicatedNode['status']; errorMsg?: string }>();

    // Merge cache & memory testResults
    cacheMap.forEach((v, k) => map.set(k, v));
    testResults.forEach((v, k) =>
      map.set(k, { latency: v.latency, status: v.status, errorMsg: v.errorMsg })
    );

    const baseNodes = deduplicateNodes(rawNodes, map);
    return baseNodes.map((node) => ({
      ...node,
      geo: geoMap[node.primaryNode.server] || null
    }));
  }, [rawNodes, testResults, geoMap]);

  // Available unique protocols for filter
  const protocols = useMemo(() => {
    const set = new Set<string>();
    rawNodes.forEach((n) => set.add(n.protocol));
    return Array.from(set);
  }, [rawNodes]);

  // Filter & Sort deduplicated nodes
  const filteredNodes = useMemo(() => {
    return deduplicatedNodes
      .filter((node) => {
        const primary = node.primaryNode;

        // Search query
        if (filterOptions.search) {
          const q = filterOptions.search.toLowerCase();
          const matchName = primary.name.toLowerCase().includes(q);
          const matchServer = primary.server.toLowerCase().includes(q);
          const matchPort = primary.port.toString().includes(q);
          if (!matchName && !matchServer && !matchPort) return false;
        }

        // Subscription filter
        if (filterOptions.subscriptionId !== 'all') {
          if (!node.sourceSubscriptions.some((s) => s.id === filterOptions.subscriptionId)) {
            return false;
          }
        }

        // Protocol filter
        if (filterOptions.protocol !== 'all') {
          if (primary.protocol !== filterOptions.protocol) return false;
        }

        // Status filter
        if (filterOptions.status === 'ok') {
          if (node.status !== 'ok') return false;
        }

        // Mismatch filter
        if (filterOptions.mismatchOnly) {
          const mismatch = detectLocationMismatch(primary.name, node.geo);
          if (!mismatch.isMismatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const factor = filterOptions.sortOrder === 'asc' ? 1 : -1;

        if (filterOptions.sortBy === 'latency') {
          const latA = a.latency !== null ? a.latency : 999999;
          const latB = b.latency !== null ? b.latency : 999999;
          return (latA - latB) * factor;
        }

        if (filterOptions.sortBy === 'name') {
          return a.primaryNode.name.localeCompare(b.primaryNode.name) * factor;
        }

        if (filterOptions.sortBy === 'protocol') {
          return a.primaryNode.protocol.localeCompare(b.primaryNode.protocol) * factor;
        }

        if (filterOptions.sortBy === 'subscription') {
          return (a.sourceSubscriptions[0]?.name || '').localeCompare(b.sourceSubscriptions[0]?.name || '') * factor;
        }

        return 0;
      });
  }, [deduplicatedNodes, filterOptions]);

  // Run Parallel IP Geo Test across all deduplicated nodes (12 concurrency pool)
  const handleRunGeoTest = useCallback(async () => {
    if (deduplicatedNodes.length === 0 || isGeoTesting) return;
    setIsGeoTesting(true);

    // Unique servers needing fetch
    const serversToFetch = Array.from(
      new Set(deduplicatedNodes.map((n) => n.primaryNode.server).filter((s) => !geoMap[s]))
    );

    if (serversToFetch.length === 0) {
      setIsGeoTesting(false);
      return;
    }

    setGeoProgress({
      total: serversToFetch.length,
      completed: 0,
      isRunning: true
    });

    const concurrency = 12;
    const queue = [...serversToFetch];
    let completedCount = 0;

    const worker = async () => {
      while (queue.length > 0) {
        const server = queue.shift();
        if (!server) break;

        const geoInfo = await fetchIPGeo(server);
        completedCount++;

        setGeoProgress((prev) => ({
          ...prev,
          completed: completedCount
        }));

        if (geoInfo) {
          // Immediately stream update to geoMap state for real-time UI refresh!
          setGeoMap((prev) => ({
            ...prev,
            [server]: geoInfo
          }));
        }
      }
    };

    const pool = Array.from({ length: Math.min(concurrency, serversToFetch.length) }, () => worker());
    await Promise.all(pool);

    setIsGeoTesting(false);
    setGeoProgress((prev) => ({ ...prev, isRunning: false }));
  }, [deduplicatedNodes, isGeoTesting, geoMap]);

  // Run full parallel speed test (also auto-triggers IP Geo test concurrently)
  const handleRunSpeedTest = async () => {
    if (deduplicatedNodes.length === 0 || testProgress.isRunning) return;

    // Trigger IP Geo testing simultaneously in parallel
    handleRunGeoTest();

    setTestProgress((prev) => ({
      ...prev,
      total: deduplicatedNodes.length,
      completed: 0,
      testing: deduplicatedNodes.length,
      success: 0,
      timeout: 0,
      error: 0,
      avgLatency: 0,
      isRunning: true
    }));

    const finalResults = await runParallelSpeedTest(deduplicatedNodes, {
      timeoutMs: 3500,
      concurrency: 25,
      onProgress: (prog, updatedNode) => {
        setTestProgress(prog);
        setTestResults((prev) => {
          const next = new Map(prev);
          next.set(updatedNode.fingerprint, updatedNode);
          return next;
        });
      }
    });

    saveLatencyCache(Array.from(finalResults.values()));
  };

  // Test single node
  const handleTestSingleNode = async (node: DeduplicatedNode) => {
    setTestResults((prev) => {
      const next = new Map(prev);
      next.set(node.fingerprint, { ...node, status: 'testing' });
      return next;
    });

    const res = await testSingleNodeLatency(node, 3500);
    const updated: DeduplicatedNode = {
      ...node,
      latency: res.latency,
      status: res.status,
      errorMsg: res.errorMsg,
      lastTested: Date.now()
    };

    setTestResults((prev) => {
      const next = new Map(prev);
      next.set(node.fingerprint, updated);
      return next;
    });

    saveLatencyCache([updated]);
  };

  // Subscription management handlers
  const handleAddSubscription = (name: string, url: string, autoUpdateHours: number) => {
    const newSub: Subscription = {
      id: `sub_${Date.now()}`,
      name,
      url,
      enabled: true,
      lastUpdated: null,
      nodeCount: 0,
      autoUpdateHours
    };
    setSubscriptions((prev) => [...prev, newSub]);
    syncSubscriptionsForList([newSub]);
  };

  const handleUpdateSubscription = (id: string, name: string, url: string, autoUpdateHours: number) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name, url, autoUpdateHours, error: null } : s))
    );
  };

  const handleDeleteSubscription = (id: string) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleToggleSubscription = (id: string) => {
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  // Export subscription links
  const handleExport = (format: 'clash' | 'base64') => {
    const targetNodes = filteredNodes.map((n) => n.primaryNode);
    if (targetNodes.length === 0) {
      alert('没有可导出的节点！');
      return;
    }

    if (format === 'base64') {
      const rawUrls = targetNodes.map((n) => n.rawUrl).join('\n');
      const b64 = btoa(unescape(encodeURIComponent(rawUrls)));
      const blob = new Blob([b64], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sub_export_${Date.now()}.txt`;
      a.click();
    } else {
      const clashYaml = `# Clash Export generated by sub-manager\nproxies:\n` +
        targetNodes.map((n) => `  - name: "${n.name}"\n    type: ${n.protocol}\n    server: ${n.server}\n    port: ${n.port}`).join('\n');
      const blob = new Blob([clashYaml], { type: 'text/yaml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clash_export_${Date.now()}.yaml`;
      a.click();
    }
  };

  // Find global lowest latency node (excluding traffic/notice nodes)
  const bestNode = useMemo(() => {
    const okNodes = deduplicatedNodes.filter(
      (n) => n.status === 'ok' && n.latency !== null && !isInformationalNode(n.primaryNode.name)
    );
    if (okNodes.length === 0) return null;
    return okNodes.reduce((min, n) => (n.latency! < min.latency! ? n : min), okNodes[0]);
  }, [deduplicatedNodes]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Header */}
      <Header
        subscriptions={subscriptions}
        nodes={filteredNodes}
        rawTotalNodeCount={rawNodes.length}
        testProgress={testProgress}
        geoProgress={geoProgress}
        deduplicate={filterOptions.deduplicate}
        onToggleDeduplicate={() =>
          setFilterOptions((prev) => ({ ...prev, deduplicate: !prev.deduplicate }))
        }
        onRefreshAllSubs={syncSubscriptions}
        onRunSpeedTest={handleRunSpeedTest}
        onRunGeoTest={handleRunGeoTest}
        onOpenSubModal={() => setIsSubModalOpen(true)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onOpenDocs={() => setIsDocOpen(true)}
        onExport={handleExport}
        isSyncing={isSyncing}
        isGeoTesting={isGeoTesting}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-4">
        
        {/* Multi-Dimensional Best Speed Node Selector */}
        <BestNodeSelector nodes={deduplicatedNodes} subscriptions={subscriptions} />

        {/* Filter Controls Bar */}
        <FilterBar
          options={filterOptions}
          subscriptions={subscriptions}
          protocols={protocols}
          onChangeOptions={(newOpts) => setFilterOptions((prev) => ({ ...prev, ...newOpts }))}
          totalFilteredCount={filteredNodes.length}
        />

        {/* Progress Bar (Visible during/after testing) */}
        <ProgressBar progress={testProgress} />

        {/* Node Grid Dashboard */}
        <NodeGrid
          nodes={filteredNodes}
          subscriptions={subscriptions}
          deduplicate={filterOptions.deduplicate}
          onTestSingleNode={handleTestSingleNode}
        />

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-600">
        VPN Subscription Manager & Local Speed Tester • Deployed on Local / Cloudflare Pages
      </footer>

      {/* Subscription Management Modal */}
      <SubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        subscriptions={subscriptions}
        onAddSubscription={handleAddSubscription}
        onUpdateSubscription={handleUpdateSubscription}
        onDeleteSubscription={handleDeleteSubscription}
        onToggleSubscription={handleToggleSubscription}
      />

      {/* Onboarding Tour Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onOpenDocs={() => setIsDocOpen(true)}
      />

      {/* User Documentation & Knowledge Base Modal */}
      <DocumentationModal
        isOpen={isDocOpen}
        onClose={() => setIsDocOpen(false)}
        onReplayTour={() => setIsOnboardingOpen(true)}
      />

    </div>
  );
}
