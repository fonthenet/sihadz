'use client'

/**
 * PharmaConnect Global v3 — B2B Hub App Within an App
 * Full platform: Dashboard, Regulatory, Partners, Market, Rare, Portfolio,
 * Projects, Tasks, Data Hub, AI Assistant, Algeria Analyzer, Email Templates
 */

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill'
import { T, THEMES, LANG, AGENCIES_DATA, PARTNERS_DATA, MARKET_CATS, RARE_DISEASES } from './pharma-global-v3-data'
import {
  RegulatoryPage,
  PartnersPage,
  MarketPage,
  RarePage,
  PortfolioPage,
  ProjectsPage,
  TasksPage,
  DataHubPage,
  AIAssistantPage,
  AlgeriaPage,
  EmailsPage,
} from './pharma-global-v3-pages'
import { CompanyDirectory } from './CompanyDirectory'
import type { LangKey } from './pharma-global-v3-data'

type ThemeKey = keyof typeof THEMES
type PageId =
  | 'dashboard'
  | 'regulatory'
  | 'partners'
  | 'market'
  | 'rare'
  | 'portfolio'
  | 'projects'
  | 'tasks'
  | 'dataHub'
  | 'ai'
  | 'algeria'
  | 'emails'
  | 'b2bCompanies'
  | 'b2bProjects'

interface PharmaGlobalV3Props {
  professional: { id: string; business_name?: string; type?: string }
}

export function PharmaGlobalV3({ professional }: PharmaGlobalV3Props) {
  const [page, setPage] = useState<PageId>('dashboard')
  const [lang, setLang] = useState<LangKey>('en')
  const { resolvedTheme } = useTheme()
  const theme: ThemeKey = resolvedTheme === 'dark' ? 'dark' : 'light'

  useEffect(() => {
    polyfillCountryFlagEmojis()
  }, [])
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'alert', msg: 'NDA deadline approaching — Project Alpha (Feb 20)', time: '2h ago', read: false },
    { id: 2, type: 'info', msg: 'openFDA sync completed — 47 new products found', time: '5h ago', read: false },
    { id: 3, type: 'success', msg: 'Meeting notes saved — Partner A follow-up', time: '1d ago', read: true },
  ])
  const [showNotif, setShowNotif] = useState(false)

  const t = LANG[lang]
  const th = THEMES[theme]
  const isRtl = lang === 'ar'

  const navItems: { id: PageId; icon: string; label: string; group?: string }[] = [
    { id: 'dashboard', icon: '🏠', label: t.dashboard },
    { id: 'regulatory', icon: '📋', label: t.regulatory, group: 'intel' },
    { id: 'partners', icon: '🏢', label: t.partners, group: 'intel' },
    { id: 'market', icon: '📈', label: t.market, group: 'intel' },
    { id: 'rare', icon: '🧬', label: t.rare, group: 'intel' },
    { id: 'algeria', icon: '🇩🇿', label: t.algeria, group: 'intel' },
    { id: 'portfolio', icon: '💊', label: t.portfolio, group: 'work' },
    { id: 'projects', icon: '📁', label: t.projects, group: 'work' },
    { id: 'tasks', icon: '✅', label: t.tasks, group: 'work' },
    { id: 'dataHub', icon: '🔌', label: t.dataHub, group: 'tools' },
    { id: 'ai', icon: '🤖', label: t.aiAssistant, group: 'tools' },
    { id: 'emails', icon: '📧', label: t.emails, group: 'tools' },
  ]

  const unreadCount = notifications.filter((n) => !n.read).length
  const inp = {
    padding: '9px 12px',
    borderRadius: '8px',
    border: `1px solid ${th.border}`,
    background: th.input,
    color: th.text,
    fontSize: '12px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    width: '100%',
  }
  const crd = {
    background: th.card,
    borderRadius: '14px',
    padding: '20px',
    border: `1px solid ${th.border}`,
  }

  // B2B Companies/Projects — show our real B2B components
  if (page === 'b2bCompanies') {
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} lang={lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en'} className="min-h-[calc(100vh-5rem)] rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-[#060910]" style={{ fontFamily: "'Twemoji Country Flags',-apple-system,'Segoe UI',sans-serif" }}>
        <PharmaNavBar
          t={t}
          th={th}
          theme={theme}
          page={page}
          setPage={setPage}
          navItems={navItems}
          unreadCount={unreadCount}
          showNotif={showNotif}
          setShowNotif={setShowNotif}
          notifications={notifications}
          setNotifications={setNotifications}
          lang={lang}
          setLang={setLang}
        />
        <main className="p-4 sm:p-6 max-w-[1400px] mx-auto">
          <CompanyDirectory professional={professional} />
        </main>
      </div>
    )
  }

  const htmlLang = lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en'
  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      lang={htmlLang}
      className="min-h-[calc(100vh-5rem)] rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.24)]"
      style={{ background: th.bg, color: th.text, fontFamily: "'Twemoji Country Flags','SF Pro Display',-apple-system,'Segoe UI',sans-serif", fontSize: '14px' }}
    >
      <style>{`
        .pharma-scrollbar::-webkit-scrollbar{width:5px}
        .pharma-scrollbar::-webkit-scrollbar-thumb{background:rgba(128,128,128,0.2);border-radius:3px}
        @keyframes pharmaFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes pharmaPulse{0%,100%{opacity:1}50%{opacity:0.5}}
      `}</style>

      <PharmaNavBar
        t={t}
        th={th}
        theme={theme}
        page={page}
        setPage={setPage}
        navItems={navItems}
        unreadCount={unreadCount}
        showNotif={showNotif}
        setShowNotif={setShowNotif}
        notifications={notifications}
        setNotifications={setNotifications}
        lang={lang}
        setLang={setLang}
      />

      <main className="max-w-[1400px] mx-auto p-4 sm:p-6 animate-[pharmaFadeIn_0.3s_ease] pharma-scrollbar min-h-[calc(100vh-12rem)] flex flex-col">
        <div className="flex-1 min-w-0">
          {page === 'dashboard' && <DashboardPage t={t} th={th} setPage={setPage} crd={crd} notifications={notifications} />}
        {page === 'regulatory' && <RegulatoryPage t={t} th={th} crd={crd} />}
        {page === 'partners' && <PartnersPage t={t} th={th} crd={crd} inp={inp} setPage={setPage} />}
        {page === 'market' && <MarketPage t={t} th={th} crd={crd} />}
        {page === 'rare' && <RarePage t={t} th={th} crd={crd} inp={inp} />}
        {page === 'portfolio' && <PortfolioPage t={t} th={th} crd={crd} inp={inp} />}
        {page === 'projects' && <ProjectsPage t={t} th={th} crd={crd} inp={inp} />}
        {page === 'tasks' && <TasksPage t={t} th={th} crd={crd} inp={inp} />}
        {page === 'dataHub' && <DataHubPage t={t} th={th} crd={crd} inp={inp} />}
        {page === 'ai' && <AIAssistantPage t={t} th={th} crd={crd} inp={inp} />}
        {page === 'algeria' && <AlgeriaPage t={t} th={th} crd={crd} />}
        {page === 'emails' && <EmailsPage t={t} th={th} crd={crd} inp={inp} />}
        </div>
      </main>

      <footer style={{ borderTop: `1px solid ${th.border}`, padding: '12px 20px', marginTop: 20 }}>
        <div className="max-w-[1400px] mx-auto flex justify-between text-[10px]" style={{ color: th.dim }}>
          <span>{t.footerDisclaimer}</span>
          <span>{t.footerHub}</span>
        </div>
      </footer>
    </div>
  )
}

function PharmaNavBar({
  t,
  th,
  page,
  setPage,
  navItems,
  unreadCount,
  showNotif,
  setShowNotif,
  notifications,
  setNotifications,
  lang,
  setLang,
  theme,
}: {
  t: (typeof LANG)['en']
  th: (typeof THEMES)['dark']
  theme: ThemeKey
  page: PageId
  setPage: (p: PageId) => void
  navItems: { id: PageId; icon: string; label: string }[]
  unreadCount: number
  showNotif: boolean
  setShowNotif: (v: boolean) => void
  notifications: { id: number; type: string; msg: string; time: string; read: boolean }[]
  setNotifications: React.Dispatch<React.SetStateAction<typeof notifications>>
  lang: LangKey
  setLang: (l: LangKey) => void
}) {
  return (
    <div
      className="sticky top-0 z-[200] border-b px-4 sm:px-6"
      style={{ borderColor: th.border, padding: '0 20px', background: th.navBg, backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-[1400px] mx-auto flex items-center gap-1 flex-wrap">
        <div
          className="flex items-center gap-2.5 cursor-pointer py-3 me-4 shrink-0"
          onClick={() => setPage('dashboard')}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px]" style={{ background: 'linear-gradient(135deg,#3B82F6,#10B981)' }}>
            ⚕️
          </div>
          <div>
            <div className="text-sm font-extrabold">{t.appName}</div>
            <div className="text-[9px]" style={{ color: th.sub }}>{t.subtitle}</div>
          </div>
        </div>

        <div className="flex gap-0.5 flex-1 overflow-x-auto min-w-0 items-center flex-wrap" style={{ scrollbarWidth: 'none' }}>
          {navItems.map((item, idx) => {
            const prev = navItems[idx - 1]
            const showDivider = prev && 'group' in prev && 'group' in item && prev.group !== item.group
            const isActive = page === item.id
            return (
              <span key={item.id} className="flex items-center gap-0.5">
                {showDivider && (
                  <span className="w-px h-5 mx-0.5 shrink-0" style={{ background: th.border }} aria-hidden />
                )}
                <button
                  onClick={() => setPage(item.id)}
                  className="py-2.5 px-3 shrink-0 flex items-center gap-2 text-[11px] font-semibold whitespace-nowrap transition-all duration-150 rounded-lg active:scale-[0.98] min-h-[36px]"
                  style={{
                    color: isActive ? '#fff' : th.sub,
                    background: isActive ? T.accent : 'transparent',
                    fontWeight: isActive ? 700 : 500,
                    boxShadow: isActive ? `0 1px 3px ${T.accent}40` : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = th.hover
                      e.currentTarget.style.color = th.text
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = th.sub
                    }
                  }}
                >
                  <span className="text-xs opacity-95">{item.icon}</span>
                  {item.label}
                </button>
              </span>
            )
          })}
        </div>

        <div className="flex gap-1.5 items-center shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowNotif(!showNotif)}
              className="bg-transparent border-none cursor-pointer text-base p-1.5 relative"
              style={{ color: th.text }}
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white" style={{ background: T.red }}>
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotif && (
              <div
                className="absolute right-0 top-full w-80 mt-1 rounded-xl p-2 z-[300] max-h-[350px] overflow-y-auto shadow-xl"
                style={{ background: th.cardSolid, border: `1px solid ${th.border}` }}
              >
                <div className="text-xs font-bold py-1.5 px-2 border-b mb-1" style={{ borderColor: th.border }}>{t.notifications}</div>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))}
                    className="py-2 px-2.5 rounded-lg cursor-pointer mb-0.5"
                    style={{ background: n.read ? 'transparent' : th.hover }}
                  >
                    <div className="text-[11px]" style={{ color: th.text, fontWeight: n.read ? 400 : 600 }}>
                      {n.type === 'alert' ? '🚨' : n.type === 'success' ? '✅' : 'ℹ️'} {n.msg}
                    </div>
                    <div className="text-[9px] mt-0.5" style={{ color: th.dim }}>{n.time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as LangKey)}
            className="px-2 py-1 rounded-md text-[10px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-transparent"
            style={{
              border: `1px solid ${th.border}`,
              background: theme === 'dark' ? th.cardSolid : th.input,
              color: th.text,
              colorScheme: theme === 'dark' ? 'dark' : 'light',
            }}
          >
            <option value="en">EN</option>
            <option value="fr">FR</option>
            <option value="ar">AR</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function DashboardPage({
  t,
  th,
  setPage,
  crd,
  notifications,
}: {
  t: (typeof LANG)['en']
  th: (typeof THEMES)['dark']
  setPage: (p: PageId) => void
  crd: React.CSSProperties
  notifications: { id: number; type: string; msg: string; read: boolean }[]
}) {
  const stats = [
    { icon: '🌍', val: AGENCIES_DATA.length, label: t.agencies, color: T.accent, pg: 'regulatory' as PageId },
    { icon: '🏢', val: PARTNERS_DATA.length, label: t.globalPartners, color: T.green, pg: 'partners' as PageId },
    { icon: '🧬', val: RARE_DISEASES.length, label: t.rarePrograms, color: T.purple, pg: 'rare' as PageId },
    { icon: '📊', val: MARKET_CATS.length, label: t.marketCats, color: T.yellow, pg: 'market' as PageId },
    { icon: '🇩🇿', val: '$4.2B', label: t.algeriaMarket, color: T.cyan, pg: 'algeria' as PageId },
    { icon: '🔌', val: 'Live', label: t.liveData, color: T.pink, pg: 'dataHub' as PageId },
  ]
  const actions = [
    { icon: '📋', title: t.regulatory, desc: t.stepByStepGuides, pg: 'regulatory' as PageId },
    { icon: '🤝', title: t.partners, desc: t.partnersDesc, pg: 'partners' as PageId },
    { icon: '📈', title: t.market, desc: t.marketDesc, pg: 'market' as PageId },
    { icon: '🤖', title: t.aiAssistant, desc: t.aiDesc, pg: 'ai' as PageId },
    { icon: '💊', title: t.portfolio, desc: t.portfolioDesc, pg: 'portfolio' as PageId },
    { icon: '📁', title: t.projects, desc: t.projectsDesc, pg: 'projects' as PageId },
    { icon: '🔌', title: t.dataHub, desc: t.dataHubDesc, pg: 'dataHub' as PageId },
    { icon: '🇩🇿', title: t.algeria, desc: t.algeriaDesc, pg: 'algeria' as PageId },
  ]

  return (
    <div>
      <div
        className="rounded-2xl p-6 sm:p-9 mb-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg,${T.accent}10,${T.green}08)`, border: `1px solid ${T.accent}15` }}
      >
        <div className="absolute -right-10 -top-10 text-[200px] opacity-[0.03]">🌍</div>
        <h1 className="text-2xl sm:text-3xl font-black mb-1.5">{t.appName}</h1>
        <p className="text-sm mb-6 max-w-[550px]" style={{ color: th.sub }}>{t.welcome}</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
          {stats.map((s) => (
            <div
              key={s.label}
              onClick={() => setPage(s.pg)}
              className="rounded-xl p-3.5 cursor-pointer transition-all border hover:-translate-y-0.5"
              style={{ background: `${s.color}12`, borderColor: `${s.color}35` }}
            >
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[10px] font-semibold" style={{ color: th.sub }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {notifications.filter((n) => !n.read).length > 0 && (
        <div
          className="rounded-xl p-3 sm:p-4 mb-4 flex items-center gap-2.5"
          style={{ background: `${T.red}10`, border: `1px solid ${T.red}20` }}
        >
          <span className="text-base">🚨</span>
          <div className="flex-1">
            {notifications.filter((n) => !n.read).map((n) => (
              <div key={n.id} className="text-xs mb-0.5" style={{ color: th.text }}>{n.msg}</div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
        {actions.map((a) => (
          <div
            key={a.title}
            onClick={() => setPage(a.pg)}
            className="rounded-xl p-5 cursor-pointer transition-all border hover:-translate-y-0.5"
            style={{ ...crd, borderColor: th.border }}
          >
            <div className="text-2xl mb-2">{a.icon}</div>
            <h3 className="text-[15px] font-bold mb-1">{a.title}</h3>
            <p className="text-[11px]" style={{ color: th.sub }}>{a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
