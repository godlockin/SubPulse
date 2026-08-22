import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { ProgressBar } from './components/ProgressBar';
import { NodeGrid } from './components/NodeGrid';
import { SubscriptionModal } from './components/SubscriptionModal';
import { SchedulerModal } from './components/SchedulerModal';
import { BestNodeSelector } from './components/BestNodeSelector';
import { OnboardingModal } from './components/OnboardingModal';
import { DocumentationModal } from './components/DocumentationModal';
import { Subscription, VPNNode, DeduplicatedNode, TestProgress, FilterOptions, ScheduleSettings } from './types/subscription';
import {
  getStoredSubscriptions,
  saveSubscriptions,
  loadSubscriptionsFromApi,
  getStoredLatencyCache,
  saveLatencyCache,
  fetchSubscriptionContent,
  getStoredScheduleSettings,
  saveScheduleSettings
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
  const [isSpeedTestQueued, setIsSpeedTestQueued] = useState(false);
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>(getStoredScheduleSettings);

  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isDocOpen, setIsDocOpen] = useState(false);

  // Keep scheduleSettings in sync with local storage
  useEffect(() => {
    saveScheduleSettings(scheduleSettings);
  }, [scheduleSettings]);

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

  // Refs for tracking latest state inside timers and async callbacks
  const scheduleSettingsRef = useRef(scheduleSettings);
  scheduleSettingsRef.current = scheduleSettings;
  const isSyncingRef = useRef(isSyncing);
  isSyncingRef.current = isSyncing;
  const isSpeedTestQueuedRef = useRef(isSpeedTestQueued);
  isSpeedTestQueuedRef.current = isSpeedTestQueued;
  const rawNodesRef = useRef(rawNodes);
  rawNodesRef.current = rawNodes;
  const subscriptionsRef = useRef(subscriptions);
  subscriptionsRef.current = subscriptions;

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

  const deduplicatedNodesRef = useRef(deduplicatedNodes);
  deduplicatedNodesRef.current = deduplicatedNodes;

  // Run Parallel IP Geo Test across all deduplicated nodes
  const handleRunGeoTest = useCallback(async (nodesToTest?: DeduplicatedNode[]) => {
    const targetNodes = nodesToTest || deduplicatedNodesRef.current;
    if (targetNodes.length === 0 || isGeoTesting) return;
    setIsGeoTesting(true);

    const currentGeo = getCachedGeoMap();
    // Unique servers needing fetch
    const serversToFetch = Array.from(
      new Set(targetNodes.map((n) => n.primaryNode.server).filter((s) => !currentGeo[s]))
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

    const concurrency = scheduleSettingsRef.current.geoConcurrency || 12;
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
  }, [isGeoTesting]);

  // Run full parallel speed test (also auto-triggers IP Geo test concurrently)
  const handleRunSpeedTest = useCallback(async (nodesToTest?: DeduplicatedNode[]) => {
    // 关键排队逻辑：若订阅更新尚未完成，节点测速（+ip回溯）自动挂起排队等待
    if (isSyncingRef.current) {
      setIsSpeedTestQueued(true);
      return;
    }

    const targetNodes = nodesToTest || deduplicatedNodesRef.current;
    if (targetNodes.length === 0 || testProgress.isRunning) return;

    // Trigger IP Geo testing simultaneously in parallel
    handleRunGeoTest(targetNodes);

    setTestProgress((prev) => ({
      ...prev,
      total: targetNodes.length,
      completed: 0,
      testing: targetNodes.length,
      success: 0,
      timeout: 0,
      error: 0,
      avgLatency: 0,
      isRunning: true
    }));

    const finalResults = await runParallelSpeedTest(targetNodes, {
      timeoutMs: scheduleSettingsRef.current.timeoutMs || 3500,
      concurrency: scheduleSettingsRef.current.concurrency || 25,
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

    // Record last speed test time
    setScheduleSettings((prev) => ({
      ...prev,
      lastSpeedTestTime: Date.now()
    }));
  }, [testProgress.isRunning, handleRunGeoTest]);

  // Parallel Sync / pull remote subscription links content
  const syncSubscriptionsForList = useCallback(async (targetSubs: Subscription[], isInitial: boolean = false) => {
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

    const newSubs = subscriptionsRef.current.map((s) => updatedSubMap.get(s.id) || s);
    setSubscriptions(newSubs);

    const keptRaw = rawNodesRef.current.filter((n) => !fetchedIds.has(n.subscriptionId));
    const nextRawNodes = [...keptRaw, ...newFetchedNodes];
    setRawNodes(nextRawNodes);

    setIsSyncing(false);

    // Record last sync time
    setScheduleSettings((prev) => ({
      ...prev,
      lastSyncTime: Date.now()
    }));

    // 计算最新的去重节点列表
    const cacheMap = getStoredLatencyCache();
    const freshDeduplicated = deduplicateNodes(nextRawNodes, cacheMap);

    // 订阅更新完成后，检查是否有排队的测速任务，或是否开启了「更新后自动测速」或「启动自测」
    const shouldRunTest = isSpeedTestQueuedRef.current || 
      scheduleSettingsRef.current.autoTestOnSync || 
      (isInitial && scheduleSettingsRef.current.autoTestOnStartup);

    if (shouldRunTest && freshDeduplicated.length > 0) {
      setIsSpeedTestQueued(false);
      setTimeout(() => {
        handleRunSpeedTest(freshDeduplicated);
      }, 100);
    }
  }, [handleRunSpeedTest]);

  const syncSubscriptions = useCallback(() => {
    setSubscriptions((latestSubs) => {
      syncSubscriptionsForList(latestSubs);
      return latestSubs;
    });
  }, [syncSubscriptionsForList]);

  // Ensure initial sync runs strictly once
  const initialSyncRef = useRef(false);

  // Auto-sync subscriptions on initial mount
  useEffect(() => {
    if (initialSyncRef.current) return;
    initialSyncRef.current = true;

    async function initData() {
      const apiSubs = await loadSubscriptionsFromApi();
      const subsToUse = (apiSubs && apiSubs.length > 0) ? apiSubs : subscriptionsRef.current;
      if (apiSubs && apiSubs.length > 0) {
        setSubscriptions(apiSubs);
      }
      if (subsToUse.some((s) => s.enabled)) {
        syncSubscriptionsForList(subsToUse, true);
      }
    }
    initData();
  }, [syncSubscriptionsForList]);

  // Periodic background scheduler heartbeat timer (checks every 5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      const settings = scheduleSettingsRef.current;
      const now = Date.now();

      // 1. 订阅定时自动更新检查
      if (settings.autoSyncEnabled) {
        const syncIntervalMs = (settings.autoSyncIntervalMinutes || 60) * 60 * 1000;
        const lastSync = settings.lastSyncTime || 0;
        if (now - lastSync >= syncIntervalMs && !isSyncingRef.current) {
          const activeSubs = subscriptionsRef.current.filter((s) => s.enabled && s.url);
          if (activeSubs.length > 0) {
            syncSubscriptionsForList(activeSubs);
          }
        }
      }

      // 2. 节点定时并发测速 (+IP回溯) 检查
      if (settings.autoSpeedTestEnabled) {
        const testIntervalMs = (settings.autoSpeedTestIntervalMinutes || 30) * 60 * 1000;
        const lastTest = settings.lastSpeedTestTime || 0;
        if (now - lastTest >= testIntervalMs) {
          if (isSyncingRef.current) {
            // 若订阅更新未完成，加入排队等待队列
            setIsSpeedTestQueued(true);
          } else if (deduplicatedNodesRef.current.length > 0) {
            handleRunSpeedTest();
          }
        }
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [syncSubscriptionsForList, handleRunSpeedTest]);

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
        scheduleSettings={scheduleSettings}
        isSpeedTestQueued={isSpeedTestQueued}
        onToggleDeduplicate={() =>
          setFilterOptions((prev) => ({ ...prev, deduplicate: !prev.deduplicate }))
        }
        onRefreshAllSubs={syncSubscriptions}
        onRunSpeedTest={() => handleRunSpeedTest()}
        onRunGeoTest={() => handleRunGeoTest()}
        onOpenSubModal={() => setIsSubModalOpen(true)}
        onOpenScheduler={() => setIsSchedulerOpen(true)}
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

      {/* Scheduled Automation & Settings Modal */}
      <SchedulerModal
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
        settings={scheduleSettings}
        onUpdateSettings={(newSettings) =>
          setScheduleSettings((prev) => ({ ...prev, ...newSettings }))
        }
        isSyncing={isSyncing}
        isTesting={testProgress.isRunning}
        isSpeedTestQueued={isSpeedTestQueued}
        onTriggerSync={syncSubscriptions}
        onTriggerSpeedTest={() => handleRunSpeedTest()}
        subscriptionsCount={subscriptions.length}
        nodesCount={deduplicatedNodes.length}
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
