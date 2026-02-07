'use client'

/**
 * PharmaConnect Global v3 — Page Components
 */

import { useState, useEffect, useRef } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts'
import {
  T,
  CHART_COLORS,
  SC,
  COUNTRY_FLAGS,
  REGION_FLAGS,
  AGENCIES_DATA,
  PARTNERS_DATA,
  MARKET_CATS,
  RARE_DISEASES,
  ALGERIA_DATA,
  EMAIL_TEMPLATES,
} from './pharma-global-v3-data'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

type ThemeKey = 'dark' | 'light'
type LangKey = 'en' | 'fr' | 'ar'
type PageId = string

const inpStyle = (th: Record<string, string>) => ({
  padding: '9px 12px',
  borderRadius: '8px',
  border: `1px solid ${th.border}`,
  background: th.input,
  color: th.text,
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box' as const,
  width: '100%',
})

const crdStyle = (th: Record<string, string>) => ({
  background: th.card,
  borderRadius: '14px',
  padding: '20px',
  border: `1px solid ${th.border}`,
})

function Dots({ n, of = 5, color = '#EF4444' }: { n: number; of?: number; color?: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: of }, (_, i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: i < n ? color : 'rgba(128,128,128,0.2)' }}
        />
      ))}
    </div>
  )
}

function BarComp({ v, mx, color, h = 6 }: { v: number; mx: number; color?: string; h?: number }) {
  return (
    <div className="rounded-full overflow-hidden" style={{ background: 'rgba(128,128,128,0.15)', height: h, width: '100%' }}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min((v / mx) * 100, 100)}%`, background: color || T.accent }}
      />
    </div>
  )
}

const LIGHT_BG = ['#FFD700', '#69F0AE', '#FF9100', '#CE93D8', '#90A4AE', '#78909C', '#FFB74D', '#4FC3F7', '#00E676']

function StatusBadge({ status }: { status: string }) {
  const bg = SC[status] || '#607D8B'
  const dk = LIGHT_BG.includes(bg)
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: bg, color: dk ? '#111' : '#fff' }}
    >
      {status}
    </span>
  )
}

export function RegulatoryPage({
  t,
  th,
  crd,
}: {
  t: Record<string, string>
  th: Record<string, string>
  crd: React.CSSProperties
}) {
  const [sel, setSel] = useState<string | null>(null)
  const [step, setStep] = useState<number | null>(null)
  const [regionF, setRegionF] = useState('All')
  const regions = ['All', ...new Set(AGENCIES_DATA.map((a) => a.region))]
  const filtered = AGENCIES_DATA.filter((a) => regionF === 'All' || a.region === regionF)
  const ag = AGENCIES_DATA.find((a) => a.id === sel)

  if (ag) {
    return (
      <div>
        <button
          onClick={() => { setSel(null); setStep(null) }}
          className="py-1.5 px-4 rounded-lg text-xs mb-3.5"
          style={{ border: `1px solid ${th.border}`, background: 'transparent', color: th.sub }}
        >
          {t.back}
        </button>
        <div
          className="rounded-2xl p-6 mb-4 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg,${ag.color}12,${ag.color}05)`, border: `1px solid ${ag.color}22` }}
        >
          <div className="absolute -right-5 -top-5 text-[110px] opacity-[0.06]">{ag.flag}</div>
          <div className="flex justify-between flex-wrap gap-3">
            <div>
              <div className="text-[13px] font-semibold" style={{ color: th.sub }}>{ag.country} {ag.flag}</div>
              <h2 className="text-2xl font-black mb-1">{ag.name}</h2>
              <div className="text-xs font-semibold" style={{ color: ag.color }}>{ag.fullName}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: 'Approval', v: ag.avgApproval },
                { l: 'Cost', v: ag.cost },
                { l: 'Market', v: ag.marketSize },
                { l: 'Difficulty', v: null },
              ].map((x) => (
                <div key={x.l} className="rounded-lg py-1.5 px-2.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
                  <div className="text-[9px] uppercase" style={{ color: th.dim }}>{x.l}</div>
                  {x.v ? <div className="text-[11px] font-semibold">{x.v}</div> : <Dots n={ag.difficulty} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <h3 className="text-base font-bold mb-3.5">🗺️ {t.stepByStep}</h3>
        <div className="relative ps-7">
          <div className="absolute left-3 top-0 bottom-0 w-0.5" style={{ background: `linear-gradient(180deg,${ag.color},${ag.color}33)` }} />
          {ag.steps.map((s, i) => {
            const open = step === i
            return (
              <div key={i} className="mb-3 relative">
                <div
                  className="absolute -left-5 top-2.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white border-[3px] z-[1]"
                  style={{ background: ag.color, borderColor: th.bg }}
                >
                  {i + 1}
                </div>
                <div
                  onClick={() => setStep(open ? null : i)}
                  className="rounded-xl py-3.5 px-4 cursor-pointer"
                  style={{ background: open ? th.hover : th.card, border: `1px solid ${open ? `${ag.color}30` : th.border}` }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold me-2" style={{ background: `${ag.color}20`, color: ag.color }}>{s.phase}</span>
                      <span className="font-bold text-[13px]">{s.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]" style={{ color: th.dim }}>⏱ {s.dur}</span>
                      <span className="text-sm transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none', color: th.dim }}>▾</span>
                    </div>
                  </div>
                  {open && (
                    <div className="mt-3.5 pt-3.5" style={{ borderTop: `1px solid ${th.border}` }}>
                      <div className="mb-3">
                        <h4 className="text-[11px] font-bold mb-1.5 uppercase" style={{ color: ag.color }}>📄 {t.documents}</h4>
                        <div className="flex flex-wrap gap-1">
                          {s.docs.map((d) => (
                            <span key={d} className="px-2.5 py-1 rounded-md text-[10px] border" style={{ background: th.hover, color: th.sub, borderColor: th.border }}>{d}</span>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg p-3" style={{ background: `${ag.color}08`, border: `1px solid ${ag.color}12` }}>
                        <h4 className="text-[11px] font-bold mb-1" style={{ color: ag.color }}>💡 {t.proTips}</h4>
                        <p className="text-[11px] leading-relaxed m-0" style={{ color: th.sub }}>{s.tips}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
          <div style={crdStyle(th)}>
            <h3 className="text-[13px] font-bold mb-2.5" style={{ color: ag.color }}>📞 Key Contacts</h3>
            {ag.keyContacts.map((c) => (
              <div key={c.name} className="py-2 border-b" style={{ borderColor: th.border }}>
                <div className="font-semibold text-xs">{c.name}</div>
                <div className="text-[10px]" style={{ color: th.dim }}>{c.role}</div>
                <div className="text-[10px]" style={{ color: ag.color }}>{c.how}</div>
              </div>
            ))}
          </div>
          <div style={{ ...crdStyle(th), background: `${ag.color}06`, border: `1px solid ${ag.color}15` }}>
            <h3 className="text-[13px] font-bold mb-2.5" style={{ color: ag.color }}>🇩🇿 {t.tipsForAlgeria}</h3>
            <p className="text-[11px] leading-relaxed m-0" style={{ color: th.sub }}>{ag.foreignTips}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">📋 {t.regulatory}</h2>
      <p className="text-[13px] mb-4" style={{ color: th.sub }}>{AGENCIES_DATA.length} countries — step-by-step approval guides</p>
      <div className="flex gap-1.5 mb-3.5 flex-wrap">
        {regions.map((r) => (
          <button
            key={r}
            onClick={() => setRegionF(r)}
            className="py-1.5 px-3.5 rounded-lg text-[11px] border"
            style={{
              borderColor: regionF === r ? T.accent : th.border,
              background: regionF === r ? `${T.accent}15` : 'transparent',
              color: regionF === r ? T.accent : th.sub,
              fontWeight: regionF === r ? 600 : 400,
            }}
          >
            {REGION_FLAGS[r] ? `${REGION_FLAGS[r]} ` : ''}{r}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {filtered.map((a) => (
          <div
            key={a.id}
            onClick={() => setSel(a.id)}
            className="rounded-xl p-5 cursor-pointer transition-all border relative overflow-hidden hover:-translate-y-0.5"
            style={{ ...crdStyle(th), borderColor: th.border }}
          >
            <div className="absolute -right-2.5 -top-2.5 text-[60px] opacity-[0.12]">{a.flag}</div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="text-3xl">{a.flag}</span>
              <div>
                <h3 className="text-base font-extrabold m-0">{a.name}</h3>
                <div className="text-[10px] font-semibold flex items-center gap-1" style={{ color: a.color }}><span>{a.flag}</span> {a.country}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <div className="rounded-lg py-1 px-2" style={{ background: 'rgba(0,0,0,0.12)' }}>
                <div className="text-[8px] uppercase" style={{ color: th.dim }}>Market</div>
                <div className="text-xs font-bold">{a.marketSize}</div>
              </div>
              <div className="rounded-lg py-1 px-2" style={{ background: 'rgba(0,0,0,0.12)' }}>
                <div className="text-[8px] uppercase" style={{ color: th.dim }}>Steps</div>
                <div className="text-xs font-bold">{a.steps.length} phases</div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <Dots n={a.difficulty} />
              <span className="text-[11px] font-semibold" style={{ color: a.color }}>View →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PartnersPage({
  t,
  th,
  crd,
  inp,
  setPage,
}: {
  t: Record<string, string>
  th: Record<string, string>
  crd: React.CSSProperties
  inp: React.CSSProperties
  setPage: (p: PageId) => void
}) {
  const [sel, setSel] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [regionF, setRegionF] = useState('All')
  const [tab, setTab] = useState<'overview' | 'products' | 'contacts' | 'approach'>('overview')
  const regions = ['All', ...new Set(PARTNERS_DATA.map((p) => p.region))]
  const filtered = PARTNERS_DATA.filter((p) => {
    if (regionF !== 'All' && p.region !== regionF) return false
    if (search) {
      const s = search.toLowerCase()
      return p.name.toLowerCase().includes(s) || p.focus.some((f) => f.toLowerCase().includes(s)) || p.country.toLowerCase().includes(s)
    }
    return true
  })
  const partner = PARTNERS_DATA.find((p) => p.id === sel)

  if (partner) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-3.5">
          <button
            onClick={() => { setSel(null); setTab('overview') }}
            className="py-1.5 px-4 rounded-lg text-xs"
            style={{ border: `1px solid ${th.border}`, background: 'transparent', color: th.sub }}
          >
            {t.back}
          </button>
          <button
            onClick={() => setPage('b2bCompanies')}
            className="py-1.5 px-4 rounded-lg text-xs font-semibold"
            style={{ border: `1px solid ${T.green}`, background: `${T.green}15`, color: T.green }}
          >
            🏢 B2B Hub: Discover Companies
          </button>
        </div>
        <div
          className="rounded-2xl p-6 mb-4 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg,${partner.color}12,${partner.color}05)`, border: `1px solid ${partner.color}22` }}
        >
          <div className="absolute -right-5 -top-5 text-[120px] opacity-[0.04]">{partner.logo}</div>
          <div className="flex justify-between flex-wrap gap-3">
            <div>
              <span className="text-3xl">{partner.logo}</span>
              <h2 className="text-2xl font-black my-1">{partner.name}</h2>
              <div className="text-[11px] font-semibold" style={{ color: partner.color }}>{partner.ticker} · {partner.flag} {partner.hq}</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: t.revenue, v: partner.revenue },
                { l: 'Market Cap', v: partner.marketCap },
                { l: 'R&D', v: partner.rdBudget },
              ].map((x) => (
                <div key={x.l} className="rounded-lg py-1.5 px-2.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
                  <div className="text-[9px] uppercase" style={{ color: th.dim }}>{x.l}</div>
                  <div className="text-[11px] font-semibold">{x.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-1.5 mt-2.5 flex-wrap">
            {partner.focus.map((f) => (
              <span key={f} className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${partner.color}20`, color: partner.color }}>{f}</span>
            ))}
          </div>
        </div>

        <div className="flex border-b mb-3.5 gap-0.5" style={{ borderColor: th.border }}>
          {[
            ['overview', `📊 ${t.overview}`],
            ['products', `💊 ${t.products}`],
            ['contacts', `👥 ${t.contacts}`],
            ['approach', `🎯 ${t.bdStrategy}`],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id as typeof tab)}
              className="py-2.5 px-4 border-b-2 border-transparent text-xs font-normal"
              style={{
                borderBottomColor: tab === id ? partner.color : 'transparent',
                background: tab === id ? th.hover : 'transparent',
                color: tab === id ? th.text : th.sub,
                fontWeight: tab === id ? 700 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div style={crdStyle(th)}>
              <h4 className="text-[13px] font-bold mb-2.5" style={{ color: partner.color }}>🔥 {t.keyProducts}</h4>
              {partner.products.filter((p) => p.hot).map((p) => (
                <div key={p.name} className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: th.border }}>
                  <div>
                    <div className="font-semibold text-xs">{p.name}</div>
                    <div className="text-[10px]" style={{ color: th.dim }}>{p.area} — {p.sales}</div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
              ))}
            </div>
            <div style={crdStyle(th)}>
              <h4 className="text-[13px] font-bold mb-2.5" style={{ color: partner.color }}>👥 {t.contacts}</h4>
              {partner.contacts.map((c) => (
                <div key={c.name} className="py-1.5 border-b" style={{ borderColor: th.border }}>
                  <div className="font-semibold text-xs">{c.name}</div>
                  <div className="text-[10px]" style={{ color: partner.color }}>{c.title}</div>
                  <div className="text-[10px]" style={{ color: th.dim }}>📧 {c.email}</div>
                </div>
              ))}
            </div>
            <div style={{ ...crdStyle(th), gridColumn: '1/-1' }}>
              <h4 className="text-[13px] font-bold mb-2.5" style={{ color: partner.color }}>🎯 {t.bestApproach}</h4>
              <p className="text-xs leading-relaxed m-0" style={{ color: th.sub }}>{partner.bdApproach}</p>
            </div>
          </div>
        )}
        {tab === 'products' && (
          <div style={crdStyle(th)}>
            {partner.products.map((p) => (
              <div key={p.name} className="flex justify-between items-center py-2.5 border-b" style={{ borderColor: th.border }}>
                <div className="flex-[2]">
                  <span className="font-bold text-xs">{p.name}</span>
                  <div className="text-[10px]" style={{ color: th.dim }}>{p.area}</div>
                </div>
                <div className="flex-1 text-[11px]" style={{ color: th.sub }}>{p.sales}</div>
                <div className="flex-1 text-[11px] font-semibold" style={{ color: p.growth?.startsWith('+') ? '#10B981' : '#EF4444' }}>{p.growth}</div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
        {tab === 'contacts' && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2.5">
            {partner.contacts.map((c) => (
              <div key={c.name} style={crdStyle(th)}>
                <div className="font-bold text-[13px]">{c.name}</div>
                <div className="text-[10px] font-semibold" style={{ color: partner.color }}>{c.title}</div>
                <div className="text-[10px] mt-1" style={{ color: th.dim }}>🏢 {c.dept} · 📧 {c.email}</div>
              </div>
            ))}
          </div>
        )}
        {tab === 'approach' && (
          <div style={crdStyle(th)}>
            <h3 className="mb-3" style={{ color: partner.color }}>🎯 {t.bestApproach}</h3>
            <p className="text-xs leading-relaxed mb-3.5" style={{ color: th.sub }}>{partner.bdApproach}</p>
            <h4 className="text-xs font-bold mb-2">📋 {t.actionPlan}</h4>
            {[
              'Research their pipeline gaps',
              'Prepare 1-pager on your capabilities',
              'Identify BD contact (Contacts tab)',
              'Submit via their partnering portal',
              'Follow up at conferences (JPM, BIO, CPHI)',
              'Prepare for due diligence: CMC, GMP, IP',
            ].map((s, i) => (
              <div key={i} className="flex gap-2 py-1">
                <span className="font-bold text-xs" style={{ color: partner.color }}>{i + 1}.</span>
                <span className="text-xs" style={{ color: th.sub }}>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">🏢 {t.partners}</h2>
      <p className="text-[13px] mb-3.5" style={{ color: th.sub }}>{PARTNERS_DATA.length} companies — including MENA regional partners</p>
      <div className="flex gap-2 mb-3.5 flex-wrap items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`🔍 ${t.search}`}
          style={{ ...inp, flex: 1, minWidth: 200 }}
        />
        {regions.map((r) => (
          <button
            key={r}
            onClick={() => setRegionF(r)}
            className="py-1.5 px-3 rounded-lg text-[10px] border"
            style={{
              borderColor: regionF === r ? T.accent : th.border,
              background: regionF === r ? `${T.accent}15` : 'transparent',
              color: regionF === r ? T.accent : th.sub,
            }}
          >
            {REGION_FLAGS[r] ? `${REGION_FLAGS[r]} ` : ''}{r}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
        {filtered.map((p) => (
          <div
            key={p.id}
            onClick={() => setSel(p.id)}
            className="rounded-xl p-5 cursor-pointer transition-all border relative overflow-hidden hover:-translate-y-0.5"
            style={{ ...crdStyle(th), borderColor: th.border }}
          >
            <div className="absolute -right-2.5 -top-2.5 text-[70px] opacity-[0.04]">{p.logo}</div>
            <span className="text-2xl">{p.logo}</span>
            <h3 className="text-base font-extrabold my-1.5">{p.name}</h3>
            <div className="text-[10px] font-semibold mb-2" style={{ color: p.color }}>{p.ticker} · {p.flag} {p.country}</div>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <div className="rounded-lg py-1 px-2" style={{ background: 'rgba(0,0,0,0.12)' }}>
                <div className="text-[8px] uppercase" style={{ color: th.dim }}>{t.revenue}</div>
                <div className="text-xs font-bold">{p.revenue}</div>
              </div>
              <div className="rounded-lg py-1 px-2" style={{ background: 'rgba(0,0,0,0.12)' }}>
                <div className="text-[8px] uppercase" style={{ color: th.dim }}>{t.products}</div>
                <div className="text-xs font-bold">{p.products.length}</div>
              </div>
            </div>
            <div className="flex gap-1 flex-wrap mb-1.5">
              {p.focus.slice(0, 3).map((f) => (
                <span key={f} className="px-2 py-0.5 rounded-lg text-[9px] font-semibold" style={{ background: `${p.color}15`, color: p.color }}>{f}</span>
              ))}
            </div>
            <div className="pt-1.5 border-t flex justify-between" style={{ borderColor: th.border }}>
              <span className="text-[10px]" style={{ color: th.dim }}>👥 {p.contacts.length} {t.contactsCount}</span>
              <span className="text-[11px] font-semibold" style={{ color: p.color }}>{t.details} →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MarketPage({ t, th, crd }: { t: Record<string, string>; th: Record<string, string>; crd: React.CSSProperties }) {
  const [sel, setSel] = useState<number | null>(null)
  const maxSize = Math.max(...MARKET_CATS.map((c) => c.size))
  const pieData = MARKET_CATS.map((c, i) => ({ name: c.name, value: c.size, fill: CHART_COLORS[i % CHART_COLORS.length] }))

  return (
    <div>
      <h2 className="text-xl font-extrabold mb-3.5">📈 {t.market}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
        <div style={crdStyle(th)}>
          <h3 className="text-sm font-bold mb-3">💰 Global Market by Category ($B)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={MARKET_CATS.map((c, i) => ({ name: c.name.substring(0, 10), size: c.size, fill: CHART_COLORS[i % CHART_COLORS.length] }))}>
              <XAxis dataKey="name" tick={{ fill: th.sub, fontSize: 9 }} axisLine={false} />
              <YAxis tick={{ fill: th.sub, fontSize: 9 }} axisLine={false} />
              <Tooltip contentStyle={{ background: th.cardSolid, border: `1px solid ${th.border}`, borderRadius: 8, color: th.text, fontSize: 11 }} />
              <Bar dataKey="size" radius={[4, 4, 0, 0]}>
                {MARKET_CATS.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={crdStyle(th)}>
          <h3 className="text-sm font-bold mb-3">🥧 Market Share Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((e, i) => (
                  <Cell key={i} fill={e.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: th.cardSolid, border: `1px solid ${th.border}`, borderRadius: 8, color: th.text, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={crdStyle(th)}>
        <h3 className="text-sm font-bold mb-3.5">📊 Detailed Category Analysis</h3>
        {MARKET_CATS.map((c, i) => (
          <div
            key={c.name}
            onClick={() => setSel(sel === i ? null : i)}
            className="mb-2.5 cursor-pointer p-2 rounded-lg"
            style={{ background: sel === i ? th.hover : 'transparent' }}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-[13px]">{c.name}</span>
              <div className="flex gap-2 items-center">
                <span className="font-bold text-xs" style={{ color: th.sub }}>${c.size}B</span>
                <span className="text-[11px] font-semibold text-emerald-500">+{c.growth}%</span>
              </div>
            </div>
            <BarComp v={c.size} mx={maxSize} color={CHART_COLORS[i % CHART_COLORS.length]} />
            {sel === i && (
              <div className="mt-2.5 p-3 rounded-lg" style={{ background: th.card, border: `1px solid ${th.border}` }}>
                <div className="grid grid-cols-3 gap-2.5 mb-2.5">
                  <div>
                    <div className="text-[10px]" style={{ color: th.dim }}>Competition</div>
                    <div className="text-xs font-semibold">{c.difficulty >= 4 ? 'Very High' : c.difficulty >= 3 ? 'High' : 'Moderate'}</div>
                  </div>
                  <div>
                    <div className="text-[10px]" style={{ color: th.dim }}>Entry Difficulty</div>
                    <Dots n={c.difficulty} />
                  </div>
                  <div>
                    <div className="text-[10px]" style={{ color: th.dim }}>Top Markets</div>
                    <div className="text-[10px]" style={{ color: th.sub }}>{c.topMarkets.map((m) => (COUNTRY_FLAGS[m.split(' ')[0]] || '') + ' ' + m).join(', ')}</div>
                  </div>
                </div>
                <div className="mb-2">
                  <div className="text-[10px] mb-1" style={{ color: th.dim }}>Hot Areas</div>
                  <div className="flex gap-1 flex-wrap">
                    {c.hot.map((h) => (
                      <span key={h} className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: `${CHART_COLORS[i % CHART_COLORS.length]}20`, color: CHART_COLORS[i % CHART_COLORS.length] }}>{h}</span>
                    ))}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg" style={{ background: `${CHART_COLORS[i % CHART_COLORS.length]}08` }}>
                  <div className="text-[10px] font-bold mb-1" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>🎯 Algeria Opportunity</div>
                  <div className="text-[11px] leading-relaxed" style={{ color: th.sub }}>{c.opportunity}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function RarePage({ t, th, crd, inp }: { t: Record<string, string>; th: Record<string, string>; crd: React.CSSProperties; inp: React.CSSProperties }) {
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState<number | null>(null)
  const filtered = RARE_DISEASES.filter(
    (d) => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.area.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">🧬 {t.rare}</h2>
      <p className="text-[13px] mb-3.5" style={{ color: th.sub }}>{RARE_DISEASES.length} programs — find collaboration opportunities</p>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`🔍 ${t.search}`} style={{ ...inp, marginBottom: 14 }} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
        {filtered.map((d, i) => {
          const open = sel === i
          const col = CHART_COLORS[i % CHART_COLORS.length]
          return (
            <div
              key={d.name}
              onClick={() => setSel(open ? null : i)}
              className="rounded-xl p-5 cursor-pointer border transition-colors"
              style={{ ...crdStyle(th), borderColor: open ? `${col}30` : th.border }}
            >
              <div className="flex justify-between mb-1.5">
                <div>
                  <h3 className="text-[13px] font-bold mb-1">{d.name}</h3>
                  <div className="flex gap-1">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: `${col}20`, color: col }}>{d.area}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] bg-opacity-20" style={{ background: th.hover, color: th.sub }}>{d.prevalence}</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold h-fit" style={{ background: `${T.accent}15`, color: T.accent }}>{d.status}</span>
              </div>
              {open && (
                <div className="pt-2.5 mt-1.5" style={{ borderTop: `1px solid ${th.border}` }}>
                  <div className="mb-2">
                    <div className="text-[10px] font-semibold mb-1" style={{ color: th.dim }}>Leading Organizations</div>
                    <div className="flex flex-wrap gap-1">
                      {d.leads.map((o) => (
                        <span key={o} className="px-2 py-0.5 rounded-md text-[10px]" style={{ background: th.hover, color: th.sub }}>{o}</span>
                      ))}
                    </div>
                  </div>
                  <div className="mb-2">
                    <div className="text-[10px] font-semibold mb-1" style={{ color: th.dim }}>Research Approach</div>
                    <div className="text-[11px]" style={{ color: th.sub }}>{d.approach}</div>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: `${col}08` }}>
                    <div className="text-[10px] font-bold mb-0.5" style={{ color: col }}>🎯 Your Opportunity</div>
                    <div className="text-[11px]" style={{ color: th.sub }}>{d.opportunity}</div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function PortfolioPage({ t, th, crd, inp }: { t: Record<string, string>; th: Record<string, string>; crd: React.CSSProperties; inp: React.CSSProperties }) {
  const [drugs, setDrugs] = useState([{ id: 1, name: '', generic: '', area: '', indication: '', stage: 'Preclinical', type: 'Generic', gmp: false, whoPQ: false, notes: '' }])
  const [analysisId, setAnalysisId] = useState<number | null>(null)
  const areas = ['Oncology', 'Immunology', 'Cardiovascular', 'Anti-infectives', 'CNS', 'Metabolic', 'Respiratory', 'Rare Disease', 'Vaccines', 'Diabetes', 'Other']
  const stages = ['Preclinical', 'Phase I', 'Phase II', 'Phase III', 'Registered', 'Marketed']
  const types = ['Generic', 'Biosimilar', 'Biologic', 'Vaccine', 'Small Molecule', 'API', 'OTC']

  function addDrug() { setDrugs((p) => [...p, { id: Date.now(), name: '', generic: '', area: '', indication: '', stage: 'Preclinical', type: 'Generic', gmp: false, whoPQ: false, notes: '' }]) }
  function upd(id: number, f: string, v: string | boolean) { setDrugs((p) => p.map((d) => (d.id === id ? { ...d, [f]: v } : d))) }

  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">💊 {t.portfolio}</h2>
      <p className="text-[13px] mb-3.5" style={{ color: th.sub }}>{t.portfolioDesc}</p>
      {drugs.map((drug, idx) => {
        const analysis = analysisId === drug.id && drug.area
        const matchCat = MARKET_CATS.find((c) => c.name.toLowerCase().includes(drug.area?.toLowerCase() || '---'))
        const matchPartners = PARTNERS_DATA.filter((p) => p.focus.some((f) => f.toLowerCase().includes(drug.area?.toLowerCase() || '---')))
        const matchAgencies = AGENCIES_DATA.filter((a) => (drug.type === 'Generic' || drug.type === 'Biosimilar') ? a.difficulty <= 3 : true).sort((a, b) => a.difficulty - b.difficulty)
        return (
          <div key={drug.id} className="mb-3" style={{ ...crdStyle(th), borderColor: analysis ? `${T.accent}40` : th.border }}>
            <div className="flex justify-between mb-3">
              <h3 className="text-sm font-bold m-0">💊 Drug #{idx + 1}{drug.name ? ` — ${drug.name}` : ''}</h3>
              <div className="flex gap-1.5">
                <button onClick={() => setAnalysisId(analysisId === drug.id ? null : drug.id)} className="py-1 px-3 rounded-md text-[10px] font-semibold border" style={{ borderColor: T.accent, background: analysis ? `${T.accent}15` : 'transparent', color: T.accent }}>{t.analyze}</button>
                {drugs.length > 1 && <button onClick={() => setDrugs((p) => p.filter((d) => d.id !== drug.id))} className="py-1 px-3 rounded-md text-[10px] border" style={{ borderColor: T.red, color: T.red, background: 'transparent' }}>{t.remove}</button>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <div><label className="text-[10px] block mb-0.5" style={{ color: th.dim }}>{t.brandName}</label><input value={drug.name} onChange={(e) => upd(drug.id, 'name', e.target.value)} placeholder="e.g., AlgeriCure" style={inpStyle(th)} /></div>
              <div><label className="text-[10px] block mb-0.5" style={{ color: th.dim }}>{t.genericInn}</label><input value={drug.generic} onChange={(e) => upd(drug.id, 'generic', e.target.value)} placeholder="e.g., amoxicillin" style={inpStyle(th)} /></div>
              <div><label className="text-[10px] block mb-0.5" style={{ color: th.dim }}>{t.therapeuticArea}</label><select value={drug.area} onChange={(e) => upd(drug.id, 'area', e.target.value)} style={{ ...inpStyle(th), color: drug.area ? th.text : th.dim }}><option value="">{t.selectPlaceholder}</option>{areas.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <div className="sm:col-span-2"><label className="text-[10px] block mb-0.5" style={{ color: th.dim }}>{t.indication}</label><input value={drug.indication} onChange={(e) => upd(drug.id, 'indication', e.target.value)} placeholder="e.g., Bacterial infections" style={inpStyle(th)} /></div>
              <div><label className="text-[10px] block mb-0.5" style={{ color: th.dim }}>{t.stage}</label><select value={drug.stage} onChange={(e) => upd(drug.id, 'stage', e.target.value)} style={inpStyle(th)}>{stages.map((s) => <option key={s}>{s}</option>)}</select></div>
              <div><label className="text-[10px] block mb-0.5" style={{ color: th.dim }}>{t.type}</label><select value={drug.type} onChange={(e) => upd(drug.id, 'type', e.target.value)} style={inpStyle(th)}>{types.map((ty) => <option key={ty}>{ty}</option>)}</select></div>
            </div>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-1 text-[11px] cursor-pointer" style={{ color: th.sub }}><input type="checkbox" checked={drug.gmp} onChange={(e) => upd(drug.id, 'gmp', e.target.checked)} />{t.gmpCertified}</label>
              <label className="flex items-center gap-1 text-[11px] cursor-pointer" style={{ color: th.sub }}><input type="checkbox" checked={drug.whoPQ} onChange={(e) => upd(drug.id, 'whoPQ', e.target.checked)} />{t.whoPrequalified}</label>
            </div>
            {analysis && matchCat && (
              <div className="pt-3.5 mt-2" style={{ borderTop: `1px solid ${th.border}` }}>
                <h4 className="text-[13px] font-bold mb-2.5" style={{ color: T.accent }}>📊 {t.marketAnalysisFor} {drug.name || t.yourProduct}</h4>
                <div className="rounded-lg p-3 mb-2.5" style={{ background: `${T.accent}06`, border: `1px solid ${T.accent}12` }}>
                  <div className="grid grid-cols-3 gap-2 mb-2"><div><span className="text-[10px]" style={{ color: th.dim }}>{t.globalSize}:</span><br /><span className="font-bold">${matchCat.size}B</span></div><div><span className="text-[10px]" style={{ color: th.dim }}>{t.growth}:</span><br /><span className="font-bold text-emerald-500">+{matchCat.growth}%</span></div><div><span className="text-[10px]" style={{ color: th.dim }}>{t.entryDifficulty}:</span><br /><Dots n={matchCat.difficulty} /></div></div>
                  <div className="text-[11px]" style={{ color: th.sub }}>{matchCat.opportunity}</div>
                </div>
                {matchPartners.length > 0 && <div className="mb-2"><div className="text-[10px] font-semibold mb-1" style={{ color: th.dim }}>🤝 {t.matchingPartners} ({matchPartners.length})</div><div className="flex gap-1 flex-wrap">{matchPartners.slice(0, 8).map((p) => <span key={p.id} className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: `${p.color}12`, color: p.color }}>{p.flag} {p.short}</span>)}</div></div>}
                <div><div className="text-[10px] font-semibold mb-1" style={{ color: th.dim }}>🌍 {t.recommendedMarkets}</div><div className="flex gap-1 flex-wrap">{matchAgencies.slice(0, 8).map((a) => <span key={a.id} className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: `${a.color}12`, color: a.color }}>{a.flag} {a.name}</span>)}</div></div>
              </div>
            )}
          </div>
        )
      })}
      <button onClick={addDrug} className="py-2.5 px-5 rounded-lg text-xs w-full border-2 border-dashed cursor-pointer" style={{ borderColor: th.border, background: 'transparent', color: th.sub }}>{t.addDrug}</button>
    </div>
  )
}

export function ProjectsPage({ t, th, crd, inp }: { t: Record<string, string>; th: Record<string, string>; crd: React.CSSProperties; inp: React.CSSProperties }) {
  const [projects] = useState([{ id: 1, name: 'Project Alpha — EU Market Entry', status: 'Active', deadline: '2026-12-31', description: 'First product EMA registration', phases: [{ name: 'Phase 1: Agreement', status: 'In Progress', actions: [{ title: 'First meeting with distributor', type: 'major', completed: true }, { title: 'Send product info package', type: 'minor', completed: false }] }] }])
  const [selP, setSelP] = useState(0)
  const [pTab, setPTab] = useState<'timeline' | 'meetings'>('timeline')
  const project = projects[selP]
  if (!project) return null
  const allActions = project.phases.flatMap((p) => p.actions)
  const done = allActions.filter((a) => a.completed).length
  const total = allActions.length
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">📁 {t.projects}</h2>
      <div className="flex gap-1.5 mb-3.5 flex-wrap">{projects.map((p, i) => <button key={p.id} onClick={() => { setSelP(i); setPTab('timeline') }} className="py-1.5 px-3.5 rounded-lg text-[11px] border" style={{ borderColor: selP === i ? T.accent : th.border, background: selP === i ? `${T.accent}15` : 'transparent', color: selP === i ? T.accent : th.sub, fontWeight: selP === i ? 600 : 400 }}>{p.name}</button>)}</div>
      <div className="mb-3.5 rounded-xl p-5" style={{ background: `linear-gradient(135deg,${T.accent}08,${T.accent}03)`, border: `1px solid ${T.accent}12` }}>
        <div className="flex justify-between flex-wrap gap-2"><div><h2 className="text-lg font-extrabold mb-0.5">{project.name}</h2><p className="text-[11px] m-0" style={{ color: th.sub }}>{project.description}</p></div><div className="grid grid-cols-4 gap-2"><div className="rounded-lg py-1.5 px-2.5 text-center" style={{ background: 'rgba(0,0,0,0.15)' }}><div className="text-lg font-black" style={{ color: T.accent }}>{done}/{total}</div><div className="text-[8px]" style={{ color: th.dim }}>{t.completed}</div></div><div className="rounded-lg py-1.5 px-2.5 text-center" style={{ background: 'rgba(0,0,0,0.15)' }}><div className="text-lg font-black">{pct}%</div><div className="text-[8px]" style={{ color: th.dim }}>{t.progress}</div></div></div></div>
        <div className="mt-2.5"><BarComp v={done} mx={total || 1} color={T.accent} /></div>
      </div>
      <div className="flex border-b mb-3.5 gap-0.5 overflow-x-auto" style={{ borderColor: th.border }}>{[['timeline', `📋 ${t.timeline}`], ['meetings', `📝 ${t.meetings}`]].map(([id, label]) => <button key={id} onClick={() => setPTab(id as typeof pTab)} className="py-2 px-3.5 border-b-2 border-transparent text-[11px] font-normal whitespace-nowrap" style={{ borderBottomColor: pTab === id ? T.accent : 'transparent', background: pTab === id ? th.hover : 'transparent', color: pTab === id ? th.text : th.sub, fontWeight: pTab === id ? 700 : 400 }}>{label}</button>)}</div>
      {pTab === 'timeline' && project.phases.map((phase, phI) => (
        <div key={phI} className="mb-3" style={crdStyle(th)}>
          <div className="flex justify-between mb-2.5"><div><h3 className="text-sm font-bold mb-0.5">{phase.name}</h3><span className="px-2 py-0.5 rounded-md text-[10px]" style={{ background: phase.status === 'In Progress' ? `${T.accent}15` : th.hover, color: phase.status === 'In Progress' ? T.accent : th.sub }}>{phase.status}</span></div><div className="w-24"><BarComp v={phase.actions.filter((a) => a.completed).length} mx={phase.actions.length || 1} color={T.accent} h={4} /></div></div>
          {phase.actions.map((a, ai) => <div key={ai} className="flex gap-2.5 py-2 border-t items-start" style={{ borderColor: th.border }}><div className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5" style={{ borderColor: a.completed ? T.green : th.dim, background: a.completed ? `${T.green}20` : 'transparent' }}>{a.completed && <span className="text-[11px] text-emerald-500">✓</span>}</div><div className="flex-1"><div className="font-semibold text-xs" style={{ color: a.completed ? th.dim : th.text, textDecoration: a.completed ? 'line-through' : 'none' }}>{a.title}</div><span className="text-[10px] me-2" style={{ background: a.type === 'major' ? `${T.red}15` : th.hover, color: a.type === 'major' ? T.red : th.sub, padding: '1px 6px', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase' }}>{a.type}</span></div></div>)}</div>
      ))}
    </div>
  )
}

export function TasksPage({ t, th, crd, inp }: { t: Record<string, string>; th: Record<string, string>; crd: React.CSSProperties; inp: React.CSSProperties }) {
  const [tasks, setTasks] = useState([{ id: 1, title: 'Prepare CMC summary for Partner A', priority: 'high' as const, deadline: '2026-02-15', done: false }, { id: 2, title: 'Review NDA template from legal', priority: 'high' as const, deadline: '2026-02-18', done: false }])
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium' as const, deadline: '' })
  const [filter, setFilter] = useState('all')
  const prioColors = { high: T.red, medium: T.yellow, low: T.green }
  const filtered = tasks.filter((ta) => filter === 'all' || (filter === 'done' ? ta.done : filter === 'active' ? !ta.done : ta.priority === filter))
  function addTask() { if (!newTask.title) return; setTasks((p) => [...p, { id: Date.now(), ...newTask, done: false }]); setNewTask({ title: '', priority: 'medium', deadline: '' }) }

  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">✅ {t.tasks}</h2>
      <p className="text-[13px] mb-3.5" style={{ color: th.sub }}>{t.taskManagerDesc}</p>
      <div className="flex gap-1.5 mb-3.5 flex-wrap">{[['all', t.filterAll], ['active', t.filterActive], ['done', t.filterDone], ['high', t.priorityHigh], ['medium', t.priorityMedium], ['low', t.priorityLow]].map(([f, l]) => <button key={f} onClick={() => setFilter(f)} className="py-1 px-3 rounded-md text-[10px] border" style={{ borderColor: filter === f ? T.accent : th.border, background: filter === f ? `${T.accent}15` : 'transparent', color: filter === f ? T.accent : th.sub }}>{l}</button>)}</div>
      <div className="mb-3.5" style={crdStyle(th)}><div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 mb-1.5"><input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder={t.newTaskPlaceholder} style={{ ...inp, gridColumn: '1/-1' }} onKeyDown={(e) => e.key === 'Enter' && addTask()} /><select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'high' | 'medium' | 'low' })} style={inp}><option value="high">{t.priorityHigh}</option><option value="medium">{t.priorityMedium}</option><option value="low">{t.priorityLow}</option></select><input type="date" value={newTask.deadline} onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })} style={inp} /><button onClick={addTask} className="py-2 rounded-lg border-none font-semibold text-[11px] cursor-pointer" style={{ background: T.accent, color: '#fff' }}>{t.addBtn}</button></div></div>
      {filtered.map((task) => { const isOD = !task.done && task.deadline && new Date(task.deadline) < new Date(); return <div key={task.id} className="flex gap-2.5 py-2.5 px-3.5 mb-1.5 items-start" style={{ ...crdStyle(th), opacity: task.done ? 0.5 : 1 }}><div onClick={() => setTasks((p) => p.map((ta) => (ta.id === task.id ? { ...ta, done: !ta.done } : ta)))} className="w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer shrink-0 mt-0.5" style={{ borderColor: task.done ? T.green : prioColors[task.priority], background: task.done ? `${T.green}20` : 'transparent' }}>{task.done && <span className="text-[11px] text-emerald-500">✓</span>}</div><div className="flex-1"><div className="font-semibold text-xs" style={{ textDecoration: task.done ? 'line-through' : 'none' }}>{task.title}</div><div className="flex gap-2 mt-0.5"><span className="px-1.5 py-0 rounded text-[9px] font-semibold" style={{ background: `${prioColors[task.priority]}15`, color: prioColors[task.priority] }}>{task.priority}</span>{task.deadline && <span className="text-[10px]" style={{ color: isOD ? T.red : th.dim }}>📅 {task.deadline}{isOD ? ' ⚠️' : ''}</span>}</div></div><button onClick={() => setTasks((p) => p.filter((ta) => ta.id !== task.id))} className="bg-transparent border-none cursor-pointer text-xs" style={{ color: th.dim }}>✕</button></div> })}
    </div>
  )
}

type DrugResult = {
  source?: 'fda' | 'ema'
  product_id?: string
  product_ndc?: string
  brand_name?: string
  generic_name?: string
  active_ingredients?: { name: string; strength?: string }[]
  labeler_name?: string
  application_number?: string
  dosage_form?: string
  route?: string[]
  marketing_category?: string
  product_type?: string
  marketing_start_date?: string
  pharm_class?: string[]
  packaging?: { package_ndc?: string; description?: string; marketing_start_date?: string }[]
  openfda?: { manufacturer_name?: string[] }
  // EMA fields
  name_of_medicine?: string
  ema_product_number?: string
  international_non_proprietary_name_common_name?: string
  active_substance?: string
  therapeutic_area_mesh?: string
  atc_code_human?: string
  pharmacotherapeutic_group_human?: string
  therapeutic_indication?: string
  marketing_authorisation_developer_applicant_holder?: string
  european_commission_decision_date?: string
  medicine_status?: string
  medicine_url?: string
  first_published_date?: string
  last_updated_date?: string
}

export function DataHubPage({ t, th, crd, inp }: { t: Record<string, string>; th: Record<string, string>; crd: React.CSSProperties; inp: React.CSSProperties }) {
  const [source, setSource] = useState<'fda' | 'ema'>('fda')
  const [query, setQuery] = useState('pfizer')
  const [results, setResults] = useState<DrugResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDrug, setSelectedDrug] = useState<DrugResult | null>(null)

  async function fetchFDA() {
    const q = (query || '').trim()
    if (!q) {
      setError(t.dataHubSearchError)
      return
    }
    setLoading(true); setError(null); setResults(null)
    try {
      const encoded = encodeURIComponent(q)
      const searchParts = [
        `openfda.manufacturer_name:${encoded}`,
        `brand_name:${encoded}`,
        `generic_name:${encoded}`,
        `pharm_class:${encoded}`,
      ]
      const url = `https://api.fda.gov/drug/ndc.json?search=${searchParts.join('+OR+')}&limit=25`
      const resp = await fetch(url)
      if (!resp.ok) {
        if (resp.status === 404) throw new Error(t.dataHubNoResults)
        throw new Error(`FDA API: ${resp.status}`)
      }
      const data = await resp.json()
      const items = (data.results || []).map((r: DrugResult) => ({ ...r, source: 'fda' as const }))
      setResults(items)
    } catch (e) { setError((e as Error).message) }
    setLoading(false)
  }

  async function fetchEMA() {
    const q = (query || '').trim()
    if (!q) {
      setError('Enter a drug name, active substance, or company to search')
      return
    }
    setLoading(true); setError(null); setResults(null)
    try {
      const resp = await fetch(`/api/b2b/ema/medicines?q=${encodeURIComponent(q)}`)
      const data = await resp.json()
      if (!resp.ok) {
        throw new Error(data.error || `EMA API: ${resp.status}`)
      }
      const items = (data.results || []).map((r: DrugResult) => ({ ...r, source: 'ema' as const }))
      setResults(items)
    } catch (e) { setError((e as Error).message) }
    setLoading(false)
  }

  function onFetch() {
    if (source === 'fda') fetchFDA()
    else fetchEMA()
  }

  const isEma = source === 'ema'
  const fetchLabel = isEma ? t.fetchEMA : t.fetchFDA
  const placeholder = isEma ? 'Drug name, active substance, company, or therapeutic class (e.g. antihistamine)...' : 'Drug name, company, or therapeutic class (e.g. antihistamine, Pfizer)...'

  return (
    <div className="flex flex-col min-h-[calc(100vh-14rem)]">
      <h2 className="text-xl font-extrabold mb-1 shrink-0">🔌 {t.dataHub}</h2>
      <p className="text-[13px] mb-3.5 shrink-0" style={{ color: th.sub }}>Live FDA &amp; EMA drug data</p>
      <div className="mb-3.5 shrink-0" style={crdStyle(th)}>
        <h3 className="text-sm font-bold mb-2">💊 Drug Search</h3>
        <div className="flex gap-2 mb-2.5">
          <button onClick={() => setSource('fda')} className={`py-1.5 px-3 rounded-lg text-[11px] font-semibold border ${source === 'fda' ? '' : 'opacity-60'}`} style={{ borderColor: source === 'fda' ? T.accent : th.border, background: source === 'fda' ? `${T.accent}15` : 'transparent', color: source === 'fda' ? T.accent : th.sub }}>{t.dataSourceFDA}</button>
          <button onClick={() => setSource('ema')} className={`py-1.5 px-3 rounded-lg text-[11px] font-semibold border ${source === 'ema' ? '' : 'opacity-60'}`} style={{ borderColor: source === 'ema' ? T.accent : th.border, background: source === 'ema' ? `${T.accent}15` : 'transparent', color: source === 'ema' ? T.accent : th.sub }}>{t.dataSourceEMA}</button>
        </div>
        <p className="text-[11px] mb-2.5" style={{ color: th.sub }}>{isEma ? 'Search by drug name, active substance, company, therapeutic area, or pharmacotherapeutic group.' : 'Search by drug name, company, generic name, or pharmacologic class (e.g. antihistamine).'}</p>
        <div className="flex gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} style={{ ...inp, flex: 1 }} onKeyDown={(e) => e.key === 'Enter' && onFetch()} />
          <button onClick={onFetch} disabled={loading} className="py-2 px-5 rounded-lg border-none font-semibold text-xs cursor-pointer disabled:opacity-70" style={{ background: T.accent, color: '#fff' }}>{loading ? t.fetchingData : fetchLabel}</button>
        </div>
      </div>
      {error && <div className="mb-3.5 shrink-0 rounded-xl p-5" style={{ ...crdStyle(th), border: `1px solid ${T.red}30`, background: `${T.red}06` }}><div className="text-xs" style={{ color: T.red }}>❌ {error}</div></div>}
      {results && (
        <div className="flex-1 min-h-0 flex flex-col mt-2" style={crdStyle(th)}>
          <h4 className="text-[13px] font-bold mb-2.5 shrink-0">📊 Results: {results.length} {isEma ? 'EMA' : 'FDA'} drugs for &quot;{query}&quot;</h4>
          <div className="flex-1 min-h-[200px] overflow-y-auto">
            {results.map((r, i) => {
              const isEmaResult = r.source === 'ema'
              const name = isEmaResult ? (r.name_of_medicine || r.international_non_proprietary_name_common_name || 'Unknown') : (r.brand_name || r.generic_name || 'Unknown')
              const ingred = isEmaResult ? (r.active_substance || r.international_non_proprietary_name_common_name || 'N/A') : (r.active_ingredients?.map((a: { name: string }) => a.name).join(', ') || 'N/A')
              const id = isEmaResult ? (r.ema_product_number || r.medicine_url || '') : (r.application_number || r.product_ndc || '')
              const mfr = isEmaResult ? r.marketing_authorisation_developer_applicant_holder : (r.labeler_name || r.openfda?.manufacturer_name?.[0])
              const tag = isEmaResult ? r.medicine_status : r.marketing_category
              return (
                <div key={r.product_id || r.ema_product_number || i} role="button" tabIndex={0} onClick={() => setSelectedDrug(r)} onKeyDown={(e) => e.key === 'Enter' && setSelectedDrug(r)} className="flex gap-2.5 py-2.5 border-b items-start cursor-pointer transition-colors" style={{ borderColor: th.border, background: 'transparent' }} onMouseEnter={(e) => { e.currentTarget.style.background = th.hover }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                  <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 font-bold text-xs" style={{ background: `${T.accent}15`, color: T.accent }}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs">{name} <span className="font-normal" style={{ color: th.dim }}>({ingred})</span></div>
                    <div className="flex gap-2 flex-wrap mt-0.5">
                      <span className="text-[10px]" style={{ color: th.sub }}>📋 {id || '—'}</span>
                      <span className="text-[10px]" style={{ color: th.sub }}>🏢 {mfr || 'N/A'}</span>
                      {r.dosage_form && <span className="text-[10px]" style={{ color: th.sub }}>💊 {r.dosage_form}</span>}
                      {tag && <span className="px-1.5 py-0 rounded text-[9px] font-semibold" style={{ background: `${T.green}15`, color: T.green }}>{tag}</span>}
                      <span className="text-[10px]" style={{ color: T.accent }}>Click for details</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Dialog open={!!selectedDrug} onOpenChange={(open) => !open && setSelectedDrug(null)}>
        <DialogContent className="dark border-slate-700 flex flex-col max-h-[min(85vh,600px)] p-0 gap-0" size="md" resizable={false} style={{ background: th.cardSolid || '#0d1117', borderColor: th.border, color: th.text, overflow: 'hidden' }}>
          {selectedDrug && (
            <>
              <DialogHeader className="shrink-0 px-6 pt-6 pb-2 border-b" style={{ borderColor: th.border }}>
                <DialogTitle className="text-lg font-bold pr-8" style={{ color: th.text }}>
                  {selectedDrug.source === 'ema'
                    ? (selectedDrug.name_of_medicine || selectedDrug.international_non_proprietary_name_common_name || 'Unknown')
                    : (selectedDrug.brand_name || selectedDrug.generic_name || 'Unknown Drug')}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-3 text-sm pharma-scrollbar">
                {selectedDrug.source === 'ema' ? (
                  <>
                    {selectedDrug.international_non_proprietary_name_common_name && (
                      <div><span className="font-semibold" style={{ color: th.dim }}>INN / common name:</span> <span>{selectedDrug.international_non_proprietary_name_common_name}</span></div>
                    )}
                    {selectedDrug.active_substance && (
                      <div><span className="font-semibold" style={{ color: th.dim }}>Active substance:</span> {selectedDrug.active_substance}</div>
                    )}
                    <div><span className="font-semibold" style={{ color: th.dim }}>Marketing authorisation holder:</span> {selectedDrug.marketing_authorisation_developer_applicant_holder || 'N/A'}</div>
                    {selectedDrug.therapeutic_area_mesh && <div><span className="font-semibold" style={{ color: th.dim }}>Therapeutic area:</span> {selectedDrug.therapeutic_area_mesh}</div>}
                    {selectedDrug.atc_code_human && <div><span className="font-semibold" style={{ color: th.dim }}>ATC code:</span> {selectedDrug.atc_code_human}</div>}
                    {selectedDrug.pharmacotherapeutic_group_human && <div><span className="font-semibold" style={{ color: th.dim }}>Pharmacotherapeutic group:</span> {selectedDrug.pharmacotherapeutic_group_human}</div>}
                    {selectedDrug.therapeutic_indication && <div><span className="font-semibold" style={{ color: th.dim }}>Therapeutic indication:</span> {selectedDrug.therapeutic_indication}</div>}
                    <div><span className="font-semibold" style={{ color: th.dim }}>EMA product number:</span> {selectedDrug.ema_product_number || 'N/A'}</div>
                    {selectedDrug.medicine_status && <div><span className="font-semibold" style={{ color: th.dim }}>Status:</span> <span className="px-1.5 py-0 rounded text-xs font-semibold" style={{ background: `${T.green}15`, color: T.green }}>{selectedDrug.medicine_status}</span></div>}
                    {selectedDrug.european_commission_decision_date && <div><span className="font-semibold" style={{ color: th.dim }}>EC decision date:</span> {selectedDrug.european_commission_decision_date}</div>}
                  </>
                ) : (
                  <>
                    {selectedDrug.generic_name && selectedDrug.generic_name !== (selectedDrug.brand_name || '') && (
                      <div><span className="font-semibold" style={{ color: th.dim }}>Generic name:</span> <span>{selectedDrug.generic_name}</span></div>
                    )}
                    {selectedDrug.active_ingredients && selectedDrug.active_ingredients.length > 0 && (
                      <div><span className="font-semibold" style={{ color: th.dim }}>Active ingredients:</span>
                        <ul className="mt-1 list-disc list-inside">
                          {selectedDrug.active_ingredients.map((a, j) => (
                            <li key={j}>{a.name}{a.strength ? ` — ${a.strength}` : ''}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div><span className="font-semibold" style={{ color: th.dim }}>Manufacturer:</span> {selectedDrug.labeler_name || selectedDrug.openfda?.manufacturer_name?.[0] || 'N/A'}</div>
                    {selectedDrug.dosage_form && <div><span className="font-semibold" style={{ color: th.dim }}>Dosage form:</span> {selectedDrug.dosage_form}</div>}
                    {selectedDrug.route && selectedDrug.route.length > 0 && <div><span className="font-semibold" style={{ color: th.dim }}>Route:</span> {selectedDrug.route.join(', ')}</div>}
                    {selectedDrug.marketing_category && <div><span className="font-semibold" style={{ color: th.dim }}>Category:</span> <span className="px-1.5 py-0 rounded text-xs font-semibold" style={{ background: `${T.green}15`, color: T.green }}>{selectedDrug.marketing_category}</span></div>}
                    <div><span className="font-semibold" style={{ color: th.dim }}>Application #:</span> {selectedDrug.application_number || 'N/A'}</div>
                    <div><span className="font-semibold" style={{ color: th.dim }}>Product NDC:</span> {selectedDrug.product_ndc || 'N/A'}</div>
                    {selectedDrug.product_type && <div><span className="font-semibold" style={{ color: th.dim }}>Product type:</span> {selectedDrug.product_type}</div>}
                    {selectedDrug.marketing_start_date && <div><span className="font-semibold" style={{ color: th.dim }}>Marketing start:</span> {selectedDrug.marketing_start_date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}</div>}
                    {selectedDrug.pharm_class && selectedDrug.pharm_class.length > 0 && (
                      <div><span className="font-semibold" style={{ color: th.dim }}>Pharmacologic class:</span>
                        <ul className="mt-1 list-disc list-inside">
                          {selectedDrug.pharm_class.slice(0, 5).map((p, j) => <li key={j}>{p}</li>)}
                        </ul>
                      </div>
                    )}
                    {selectedDrug.packaging && selectedDrug.packaging.length > 0 && (
                      <div><span className="font-semibold" style={{ color: th.dim }}>Packaging:</span>
                        <ul className="mt-1 list-disc list-inside">
                          {selectedDrug.packaging.slice(0, 4).map((p, j) => <li key={j}>{p.description || p.package_ndc || '—'}</li>)}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
              <DialogFooter className="shrink-0 px-6 py-4 border-t" style={{ borderColor: th.border }}>
                {selectedDrug.source === 'ema' ? (
                  <a href={selectedDrug.medicine_url || 'https://www.ema.europa.eu/en/medicines'} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: T.accent, color: '#fff' }}>View on EMA ↗</a>
                ) : (
                  <a href={selectedDrug.application_number ? `https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=${selectedDrug.application_number}` : `https://www.accessdata.fda.gov/scripts/cder/ndc/index.cfm`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: T.accent, color: '#fff' }}>View on FDA ↗</a>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function AIAssistantPage({ t, th, crd, inp }: { t: Record<string, string>; th: Record<string, string>; crd: React.CSSProperties; inp: React.CSSProperties }) {
  const [messages, setMessages] = useState([{ role: 'assistant' as const, content: "🤖 Hello! I'm your AI pharmaceutical advisor. I can help with regulatory strategy, market entry, partner identification, drug development, and MENA/Africa intelligence. What would you like to know?" }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const quickQ = ['Best strategy to enter Saudi market from Algeria?', 'Which drugs for MENA region?', 'How to approach Sanofi for partnership?']

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(q?: string) {
    const query = q || input
    if (!query.trim()) return
    setMessages((prev) => [...prev, { role: 'user', content: query }])
    setInput('')
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 800))
      setMessages((prev) => [...prev, { role: 'assistant', content: `For "${query}" we recommend:\n\n1. **Regulatory**: Check the Regulatory tab for step-by-step guides (FDA, EMA, SFDA, JFDA).\n2. **Partners**: Use the Partners tab to find matching companies and BD approach.\n3. **Market**: Review Market Analysis for category opportunities.\n4. **Algeria**: See Algeria Analyzer for local market insights.\n\nAI integration can be added via your backend.` }])
    } catch { setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${t.aiConnectionError}` }]) }
    setLoading(false)
  }

  return (
    <div>
      <h2 className="text-xl font-extrabold mb-3.5">🤖 {t.aiAssistant}</h2>
      <div className="flex gap-1.5 mb-3.5 flex-wrap">{quickQ.map((q) => <button key={q} onClick={() => send(q)} className="py-1.5 px-3 rounded-lg text-[10px] border transition-colors cursor-pointer" style={{ borderColor: th.border, background: th.card, color: th.sub }}>{q}</button>)}</div>
      <div className="flex flex-col" style={{ ...crdStyle(th), height: 450 }}><div className="flex-1 overflow-y-auto mb-2.5">{messages.map((m, i) => <div key={i} className="flex mb-2" style={{ justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}><div className="max-w-[80%] py-2.5 px-3.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap" style={{ background: m.role === 'user' ? T.accent : th.hover, color: m.role === 'user' ? '#fff' : th.text }}>{m.content}</div></div>)}{loading && <div className="flex justify-start mb-2"><div className="py-2.5 px-3.5 rounded-xl text-xs animate-pulse" style={{ background: th.hover }}>🤖 {t.aiThinking}</div></div>}<div ref={bottomRef} /></div><div className="flex gap-2"><input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.askAI} style={{ ...inp, flex: 1 }} onKeyDown={(e) => e.key === 'Enter' && !loading && send()} /><button onClick={() => send()} disabled={loading} className="py-2 px-5 rounded-lg border-none font-semibold text-xs cursor-pointer disabled:cursor-wait" style={{ background: T.accent, color: '#fff' }}>{t.send}</button></div></div>
    </div>
  )
}

export function AlgeriaPage({ t, th, crd }: { t: Record<string, string>; th: Record<string, string>; crd: React.CSSProperties }) {
  const d = ALGERIA_DATA
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">🇩🇿 {t.algeriaMarket}</h2>
      <p className="text-[13px] mb-3.5" style={{ color: th.sub }}>{d.marketSize} market · {d.growth} · {d.population} population</p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2.5 mb-4">{[{ l: t.marketSizeLabel, v: d.marketSize, c: T.accent }, { l: t.growth, v: d.growth, c: T.green }, { l: t.populationLabel, v: d.population, c: T.purple }, { l: t.localProduction, v: d.localProduction, c: T.yellow }, { l: t.importsLabel, v: d.imports, c: T.red }].map((s) => <div key={s.l} style={{ ...crdStyle(th), textAlign: 'center' }}><div className="text-2xl font-black" style={{ color: s.c }}>{s.v}</div><div className="text-[10px]" style={{ color: th.dim }}>{s.l}</div></div>)}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5"><div style={crdStyle(th)}><h3 className="text-sm font-bold mb-2.5">📈 {t.marketSizeTrend} ($B)</h3><ResponsiveContainer width="100%" height={200}><AreaChart data={d.yearlyTrend}><CartesianGrid strokeDasharray="3 3" stroke={th.border} /><XAxis dataKey="yr" tick={{ fill: th.sub, fontSize: 9 }} /><YAxis tick={{ fill: th.sub, fontSize: 9 }} /><Tooltip contentStyle={{ background: th.cardSolid, border: `1px solid ${th.border}`, borderRadius: 8, color: th.text, fontSize: 11 }} /><Area type="monotone" dataKey="val" stroke={T.accent} fill={`${T.accent}20`} strokeWidth={2} /></AreaChart></ResponsiveContainer></div><div style={crdStyle(th)}><h3 className="text-sm font-bold mb-2.5">🌍 {t.importSources}</h3><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={d.topImportSources} cx="50%" cy="50%" outerRadius={80} dataKey="pct" label={({ name, pct, flag }: { name: string; pct: number; flag?: string }) => `${flag || ''} ${name} ${pct}%`}>{d.topImportSources.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: th.cardSolid, border: `1px solid ${th.border}`, borderRadius: 8, color: th.text, fontSize: 11 }} /></PieChart></ResponsiveContainer><div className="flex flex-wrap gap-2 mt-2.5 pt-2.5" style={{ borderTop: `1px solid ${th.border}` }}>{d.topImportSources.map((s) => <span key={s.name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: th.hover }}>{s.flag} {s.name} {s.pct}%</span>)}</div></div></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5"><div style={crdStyle(th)}><h3 className="text-sm font-bold mb-2.5">🏢 {t.keyLocalPlayers}</h3>{d.keyPlayers.map((p) => <div key={p} className="flex items-center gap-2 py-1.5 border-b" style={{ borderColor: th.border }}><span className="text-sm">🏭</span><span className="text-xs font-semibold">{p}</span></div>)}</div><div style={crdStyle(th)}><h3 className="text-sm font-bold mb-2.5">🎯 {t.topOpportunities}</h3>{d.opportunities.map((o, i) => <div key={i} className="flex gap-2 py-1.25"><span className="text-xs text-emerald-500">✓</span><span className="text-xs" style={{ color: th.sub }}>{o}</span></div>)}</div><div style={{ ...crdStyle(th), gridColumn: '1/-1' }}><h3 className="text-sm font-bold mb-2">📜 {t.regulatoryEnv}</h3><p className="text-xs leading-relaxed m-0" style={{ color: th.sub }}>{d.regulations}</p></div></div>
    </div>
  )
}

export function EmailsPage({ t, th, crd, inp }: { t: Record<string, string>; th: Record<string, string>; crd: React.CSSProperties; inp: React.CSSProperties }) {
  const [selTemplate, setSelTemplate] = useState<string | null>(null)
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  function useTemplate(tmpl: { id: string; subject: string; body: string }) { setSelTemplate(tmpl.id); setEmailSubject(tmpl.subject); setEmailBody(tmpl.body) }

  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">📧 {t.emails}</h2>
      <p className="text-[13px] mb-3.5" style={{ color: th.sub }}>{t.emailsDesc}</p>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3.5"><div><div className="text-[11px] font-semibold uppercase mb-2" style={{ color: th.dim }}>Templates</div>{EMAIL_TEMPLATES.map((tmpl) => <div key={tmpl.id} onClick={() => useTemplate(tmpl)} className="mb-1.5 cursor-pointer rounded-xl p-3" style={{ ...crdStyle(th), borderColor: selTemplate === tmpl.id ? T.accent : th.border }}><div className="font-semibold text-xs" style={{ color: selTemplate === tmpl.id ? T.accent : th.text }}>{tmpl.name}</div><div className="text-[10px] mt-0.5" style={{ color: th.dim }}>{tmpl.subject.substring(0, 40)}...</div></div>)}</div><div style={crdStyle(th)}><h3 className="text-sm font-bold mb-3.5">✉️ Compose Email</h3><div className="mb-2"><label className="text-[10px] block mb-0.5" style={{ color: th.dim }}>{t.emailTo}</label><input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="recipient@company.com" style={inpStyle(th)} /></div><div className="mb-2"><label className="text-[10px] block mb-0.5" style={{ color: th.dim }}>{t.emailSubject}</label><input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Subject..." style={inpStyle(th)} /></div><div className="mb-2.5"><label className="text-[10px] block mb-0.5" style={{ color: th.dim }}>{t.emailBody}</label><textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Compose..." style={{ ...inpStyle(th), minHeight: 300, resize: 'vertical', lineHeight: 1.7 }} /></div><div className="flex gap-2"><button onClick={() => emailTo && window.open(`mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`)} className="py-2 px-5 rounded-lg border-none font-semibold text-xs cursor-pointer" style={{ background: T.accent, color: '#fff' }}>📧 {t.send} via Email</button><button onClick={() => navigator.clipboard?.writeText(emailBody)} className="py-2 px-5 rounded-lg text-xs cursor-pointer border" style={{ borderColor: th.border, background: 'transparent', color: th.sub }}>📋 Copy</button></div></div></div>
    </div>
  )
}
