"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import {
  Settings2,
  X,
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/useAppI18n";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface WidgetConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

export interface DashboardPreferences {
  widgets: WidgetConfig[];
  compactMode: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // seconds
}

/* -------------------------------------------------------------------------- */
/*  Defaults                                                                   */
/* -------------------------------------------------------------------------- */

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "kpi-users", label: "Utilisateurs", visible: true, order: 0 },
  { id: "kpi-jobs", label: "Jobs Actifs", visible: true, order: 1 },
  { id: "kpi-escrow", label: "Escrow Total", visible: true, order: 2 },
  { id: "kpi-revenue", label: "Revenu Plateforme", visible: true, order: 3 },
  { id: "kpi-completed", label: "Jobs Complétés", visible: true, order: 4 },
  {
    id: "kpi-verified",
    label: "Transporteurs Vérifiés",
    visible: true,
    order: 5,
  },
  { id: "kpi-disputes", label: "Litiges Actifs", visible: true, order: 6 },
  { id: "kpi-trust", label: "Score Confiance", visible: true, order: 7 },
  {
    id: "section-jobs",
    label: "Jobs Récents (Table)",
    visible: true,
    order: 8,
  },
  { id: "section-alerts", label: "Alertes Système", visible: true, order: 9 },
  {
    id: "section-activity",
    label: "Activité Récente",
    visible: true,
    order: 10,
  },
];

const DEFAULT_PREFS: DashboardPreferences = {
  widgets: DEFAULT_WIDGETS,
  compactMode: false,
  autoRefresh: false,
  refreshInterval: 60,
};

const STORAGE_KEY = "transporti-dashboard-prefs";

/* -------------------------------------------------------------------------- */
/*  Context                                                                    */
/* -------------------------------------------------------------------------- */

interface DashboardConfigContextType {
  prefs: DashboardPreferences;
  updatePrefs: (prefs: DashboardPreferences) => void;
  isWidgetVisible: (id: string) => boolean;
  getWidgetOrder: (id: string) => number;
  showConfigPanel: boolean;
  setShowConfigPanel: (show: boolean) => void;
}

const DashboardConfigContext = createContext<DashboardConfigContextType>({
  prefs: DEFAULT_PREFS,
  updatePrefs: () => {},
  isWidgetVisible: () => true,
  getWidgetOrder: () => 0,
  showConfigPanel: false,
  setShowConfigPanel: () => {},
});

export function useDashboardConfig() {
  return useContext(DashboardConfigContext);
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                   */
/* -------------------------------------------------------------------------- */

export function DashboardConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [prefs, setPrefs] = useState<DashboardPreferences>(DEFAULT_PREFS);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DashboardPreferences;
        // Merge with defaults to handle new widgets added in later versions
        const mergedWidgets = DEFAULT_WIDGETS.map((dw) => {
          const saved = parsed.widgets.find((w) => w.id === dw.id);
          return saved || dw;
        });
        setPrefs({ ...DEFAULT_PREFS, ...parsed, widgets: mergedWidgets });
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  const updatePrefs = useCallback((newPrefs: DashboardPreferences) => {
    setPrefs(newPrefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
  }, []);

  const isWidgetVisible = useCallback(
    (id: string) => prefs.widgets.find((w) => w.id === id)?.visible ?? true,
    [prefs.widgets],
  );

  const getWidgetOrder = useCallback(
    (id: string) => prefs.widgets.find((w) => w.id === id)?.order ?? 0,
    [prefs.widgets],
  );

  if (!loaded) return null;

  return (
    <DashboardConfigContext.Provider
      value={{
        prefs,
        updatePrefs,
        isWidgetVisible,
        getWidgetOrder,
        showConfigPanel,
        setShowConfigPanel,
      }}
    >
      {children}
    </DashboardConfigContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Settings Button (to put in dashboard header)                              */
/* -------------------------------------------------------------------------- */

export function DashboardSettingsButton() {
  const { setShowConfigPanel } = useDashboardConfig();
  const { t } = useI18n();
  return (
    <button
      onClick={() => setShowConfigPanel(true)}
      className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#1e293b] border border-neutral-200 dark:border-neutral-600 rounded-xl text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
      title={t.config.title}
    >
      <Settings2 className="w-4 h-4" />
      <span className="hidden sm:inline">{t.dashboard.customize}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Config Panel (Slide-over drawer)                                          */
/* -------------------------------------------------------------------------- */

export function DashboardConfigPanel() {
  const { prefs, updatePrefs, showConfigPanel, setShowConfigPanel } =
    useDashboardConfig();
  const { t } = useI18n();
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>([]);
  const [localCompact, setLocalCompact] = useState(false);
  const [localAutoRefresh, setLocalAutoRefresh] = useState(false);
  const [localRefreshInterval, setLocalRefreshInterval] = useState(60);

  // Sync local state when panel opens
  useEffect(() => {
    if (showConfigPanel) {
      setLocalWidgets([...prefs.widgets].sort((a, b) => a.order - b.order));
      setLocalCompact(prefs.compactMode);
      setLocalAutoRefresh(prefs.autoRefresh);
      setLocalRefreshInterval(prefs.refreshInterval);
    }
  }, [showConfigPanel, prefs]);

  const toggleVisibility = (id: string) => {
    setLocalWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)),
    );
  };

  const moveWidget = (index: number, direction: "up" | "down") => {
    const newWidgets = [...localWidgets];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newWidgets.length) return;
    [newWidgets[index], newWidgets[targetIndex]] = [
      newWidgets[targetIndex],
      newWidgets[index],
    ];
    // Recalculate order
    newWidgets.forEach((w, i) => (w.order = i));
    setLocalWidgets(newWidgets);
  };

  const handleSave = () => {
    updatePrefs({
      widgets: localWidgets,
      compactMode: localCompact,
      autoRefresh: localAutoRefresh,
      refreshInterval: localRefreshInterval,
    });
    setShowConfigPanel(false);
  };

  const handleReset = () => {
    setLocalWidgets([...DEFAULT_WIDGETS]);
    setLocalCompact(false);
    setLocalAutoRefresh(false);
    setLocalRefreshInterval(60);
  };

  if (!showConfigPanel) return null;

  const visibleCount = localWidgets.filter((w) => w.visible).length;

  // Dynamic label map for i18n
  const widgetLabelMap: Record<string, string> = {
    "kpi-users": t.dashboard.kpiUsers,
    "kpi-jobs": t.dashboard.kpiActiveJobs,
    "kpi-escrow": t.dashboard.kpiEscrow,
    "kpi-revenue": t.dashboard.kpiRevenue,
    "kpi-completed": t.dashboard.kpiCompleted,
    "kpi-verified": t.dashboard.kpiVerified,
    "kpi-disputes": t.dashboard.kpiDisputes,
    "kpi-trust": t.dashboard.kpiTrust,
    "section-jobs": t.dashboard.recentJobs,
    "section-alerts": t.dashboard.systemAlerts,
    "section-activity": t.dashboard.recentActivity,
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
      <div className="bg-white dark:bg-[#1e293b] w-full max-w-md h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#1e293b] border-b border-neutral-200 dark:border-neutral-700 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600/10 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900 dark:text-white">
                {t.config.title}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {visibleCount} {t.config.widgetsActive}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConfigPanel(false)}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Widget List */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-neutral-400" />
              {t.config.widgetsAndSections}
            </h3>
            <div className="space-y-2">
              {localWidgets.map((widget, index) => (
                <div
                  key={widget.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    widget.visible
                      ? "bg-white dark:bg-[#0f172a] border-neutral-200 dark:border-neutral-600"
                      : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-700 opacity-60"
                  }`}
                >
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveWidget(index, "up")}
                      disabled={index === 0}
                      className="p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveWidget(index, "down")}
                      disabled={index === localWidgets.length - 1}
                      className="p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Label */}
                  <span
                    className={`flex-1 text-sm font-medium ${
                      widget.visible
                        ? "text-neutral-700 dark:text-neutral-200"
                        : "text-neutral-400 dark:text-neutral-500 line-through"
                    }`}
                  >
                    {widget.id.startsWith("kpi-") ? "📊 " : "📋 "}
                    {widgetLabelMap[widget.id] || widget.label}
                  </span>

                  {/* Toggle */}
                  <button
                    onClick={() => toggleVisibility(widget.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      widget.visible
                        ? "text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-600/10"
                        : "text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    }`}
                    title={widget.visible ? t.config.hide : t.config.show}
                  >
                    {widget.visible ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-200 dark:border-neutral-700" />

          {/* Display Options */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
              {t.config.displayOptions}
            </h3>
            <div className="space-y-3">
              {/* Compact Mode */}
              <label className="flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-[#0f172a] border border-neutral-200 dark:border-neutral-600 cursor-pointer">
                <div>
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    {t.config.compactMode}
                  </span>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                    {t.config.compactDesc}
                  </p>
                </div>
                <div
                  onClick={() => setLocalCompact(!localCompact)}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                    localCompact
                      ? "bg-brand-600"
                      : "bg-neutral-300 dark:bg-neutral-600"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      localCompact ? "translate-x-5" : ""
                    }`}
                  />
                </div>
              </label>

              {/* Auto Refresh */}
              <label className="flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-[#0f172a] border border-neutral-200 dark:border-neutral-600 cursor-pointer">
                <div>
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    {t.config.autoRefresh}
                  </span>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                    {t.config.autoRefreshDesc}
                  </p>
                </div>
                <div
                  onClick={() => setLocalAutoRefresh(!localAutoRefresh)}
                  className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                    localAutoRefresh
                      ? "bg-brand-600"
                      : "bg-neutral-300 dark:bg-neutral-600"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      localAutoRefresh ? "translate-x-5" : ""
                    }`}
                  />
                </div>
              </label>

              {/* Refresh Interval */}
              {localAutoRefresh && (
                <div className="px-4 py-3 rounded-xl bg-white dark:bg-[#0f172a] border border-neutral-200 dark:border-neutral-600">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    {t.config.interval}
                  </span>
                  <select
                    value={localRefreshInterval}
                    onChange={(e) =>
                      setLocalRefreshInterval(Number(e.target.value))
                    }
                    className="mt-2 w-full px-3 py-2 bg-neutral-50 dark:bg-[#1e293b] border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm text-neutral-700 dark:text-neutral-200"
                  >
                    <option value={30}>{t.config.seconds30}</option>
                    <option value={60}>{t.config.minute1}</option>
                    <option value={120}>{t.config.minutes2}</option>
                    <option value={300}>{t.config.minutes5}</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-[#1e293b] border-t border-neutral-200 dark:border-neutral-700 px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {t.config.reset}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfigPanel(false)}
              className="px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              {t.config.cancel}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
            >
              {t.config.apply}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
