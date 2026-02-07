'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Building2,
  Search,
  ExternalLink,
  Mail,
  Loader2,
  Globe,
  Send,
  RefreshCw,
  Users,
  Pill,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  'Top Seller': 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  'Mega Blockbuster': 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  'Rising Star': 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
  'High Growth': 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
  'Fast Growing': 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
  'Strong Growth': 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
  'New Launch': 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  'Pipeline Star': 'bg-violet-500/20 text-violet-600 border-violet-500/30',
  'Pipeline': 'bg-violet-500/20 text-violet-600 border-violet-500/30',
  'Flagship': 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  'Blockbuster': 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  'Innovative': 'bg-sky-500/20 text-sky-600 border-sky-500/30',
  'Pfizer $6B Deal': 'bg-rose-500/20 text-rose-600 border-rose-500/30',
  'OTC Leader': 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  'Patent Cliff': 'bg-red-500/20 text-red-600 border-red-500/30',
  'Mature': 'bg-slate-500/20 text-slate-600 border-slate-500/30',
  'Stable': 'bg-slate-500/20 text-slate-600 border-slate-500/30',
  'Established': 'bg-slate-500/20 text-slate-600 border-slate-500/30',
  'Growing': 'bg-sky-500/20 text-sky-600 border-sky-500/30',
  'Emerging': 'bg-sky-500/20 text-sky-600 border-sky-500/30',
  'Niche': 'bg-slate-500/20 text-slate-600 border-slate-500/30',
  'Strategic': 'bg-amber-500/20 text-amber-600 border-amber-500/30',
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_COLORS[status]
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] font-bold px-2 py-0 h-5', style || 'bg-muted text-muted-foreground')}
    >
      {status}
    </Badge>
  )
}

interface Company {
  id: string
  name: string
  slug: string
  short_name?: string | null
  website?: string | null
  country?: string | null
  logo_url?: string | null
  description?: string | null
  business_development_url?: string | null
  partnership_contact_url?: string | null
  hq?: string | null
  ticker?: string | null
  revenue?: string | null
  accent_color?: string | null
  focus_areas?: string[] | null
  collaboration_opportunities?: string[] | null
}

interface Contact {
  id: string
  name: string
  title?: string | null
  department?: string | null
  email?: string | null
  year_since?: string | null
  co?: string
  cc?: string
}

interface Product {
  id: string
  name: string
  generic_name?: string | null
  therapeutic_area?: string | null
  indication?: string | null
  sales?: string | null
  growth?: string | null
  status_badge?: string | null
  is_highlighted?: boolean | null
  co?: string
  cc?: string
}

interface Proposal {
  id: string
  status: string
  sent_at?: string | null
  created_at: string
  project?: { id: string; title: string } | null
}

interface CompanyDetail {
  company: Company
  contacts: Contact[]
  products: Product[]
  proposals?: Proposal[]
}

interface CompanyDirectoryProps {
  professional: { id: string }
}

interface Project {
  id: string
  title: string
  status: string
}

export function CompanyDirectory({ professional }: CompanyDirectoryProps) {
  const { toast } = useToast()
  const [companies, setCompanies] = useState<Company[]>([])
  const [stats, setStats] = useState({ companiesCount: 0, contactsCount: 0, productsCount: 0 })
  const [searchResults, setSearchResults] = useState<{ contacts: Contact[]; products: Product[] }>({ contacts: [], products: [] })
  const [search, setSearch] = useState('')
  const [selectedCompany, setSelectedCompany] = useState<CompanyDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState<'overview' | 'contacts' | 'products' | 'collab'>('overview')
  const [detailSearch, setDetailSearch] = useState('')
  const [proposalCompany, setProposalCompany] = useState<Company | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [proposalStatus, setProposalStatus] = useState<'draft' | 'sent'>('draft')
  const [creatingProposal, setCreatingProposal] = useState(false)
  const [syncingProducts, setSyncingProducts] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/b2b/multinational/companies?${params}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setCompanies(data.companies ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search])

  const fetchSearch = useCallback(async () => {
    setLoadingStats(true)
    try {
      const res = await fetch(`/api/b2b/multinational/search?q=${encodeURIComponent(search)}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setStats(data.stats ?? { companiesCount: 0, contactsCount: 0, productsCount: 0 })
      if (search.trim()) {
        setSearchResults({ contacts: data.contacts ?? [], products: data.products ?? [] })
      } else {
        setSearchResults({ contacts: [], products: [] })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingStats(false)
    }
  }, [search])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  useEffect(() => {
    fetchSearch()
  }, [fetchSearch])

  const openCompanyDetail = async (company: Company) => {
    setDetailLoading(true)
    setSelectedCompany(null)
    setDetailTab('overview')
    setDetailSearch('')
    try {
      const res = await fetch(`/api/b2b/multinational/companies/${company.id}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setSelectedCompany(data)
    } catch (e) {
      console.error(e)
    } finally {
      setDetailLoading(false)
    }
  }

  const openProposalDialog = async (company: Company) => {
    setProposalCompany(company)
    setSelectedProjectId('')
    try {
      const res = await fetch('/api/b2b/projects', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch projects')
      const data = await res.json()
      setProjects(data.projects ?? [])
      if (data.projects?.length > 0) setSelectedProjectId(data.projects[0].id)
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Failed to load projects', variant: 'destructive' })
    }
  }

  const syncProducts = async (companyId: string) => {
    setSyncingProducts(true)
    try {
      const res = await fetch(`/api/b2b/multinational/companies/${companyId}/sync-products`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Sync failed')
      const data = await res.json()
      toast({ title: 'Success', description: `Added ${data.added ?? 0} products from openFDA` })
      if (selectedCompany?.company.id === companyId) {
        openCompanyDetail(selectedCompany.company)
      }
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSyncingProducts(false)
    }
  }

  const createProposal = async () => {
    if (!proposalCompany || !selectedProjectId) {
      toast({ title: 'Error', description: 'Select a project', variant: 'destructive' })
      return
    }
    setCreatingProposal(true)
    try {
      const res = await fetch('/api/b2b/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: selectedProjectId,
          company_id: proposalCompany.id,
          status: proposalStatus,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create proposal')
      }
      toast({ title: 'Success', description: 'Proposal created' })
      setProposalCompany(null)
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setCreatingProposal(false)
    }
  }

  const co = selectedCompany?.company
  const accent = co?.accent_color ?? '#607D8B'
  const allContacts = selectedCompany?.contacts ?? []
  const allProducts = selectedCompany?.products ?? []
  const filteredContacts = !detailSearch
    ? allContacts
    : allContacts.filter((c: Contact) =>
        c.name.toLowerCase().includes(detailSearch.toLowerCase()) ||
        (c.title ?? '').toLowerCase().includes(detailSearch.toLowerCase()) ||
        (c.department ?? '').toLowerCase().includes(detailSearch.toLowerCase())
      )
  const filteredProducts = !detailSearch
    ? allProducts
    : allProducts.filter((p: Product) =>
        p.name.toLowerCase().includes(detailSearch.toLowerCase()) ||
        (p.therapeutic_area ?? '').toLowerCase().includes(detailSearch.toLowerCase()) ||
        (p.indication ?? '').toLowerCase().includes(detailSearch.toLowerCase())
      )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">PharmaConnect Directory</h3>
        <p className="text-sm text-muted-foreground">
          Discover worldwide labs and pharma companies. Search contacts, products, and propose collaborations.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies, contacts, products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-4 sm:gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold">{loadingStats ? '…' : stats.companiesCount}</span>
            <span className="text-muted-foreground">Companies</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold">{loadingStats ? '…' : stats.contactsCount}</span>
            <span className="text-muted-foreground">Contacts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Pill className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold">{loadingStats ? '…' : stats.productsCount}</span>
            <span className="text-muted-foreground">Products</span>
          </div>
        </div>
      </div>

      {search.trim() && (searchResults.contacts.length > 0 || searchResults.products.length > 0) && (
        <div className="space-y-4">
          {searchResults.contacts.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Contacts ({searchResults.contacts.length})
              </h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {searchResults.contacts.slice(0, 6).map((c) => (
                  <Card
                    key={c.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors rounded-none sm:rounded-xl"
                    onClick={() => {
                      const cid = (c as Contact & { company_id?: string }).company_id
                      if (cid) {
                        setDetailLoading(true)
                        fetch(`/api/b2b/multinational/companies/${cid}`)
                          .then((r) => r.json())
                          .then((d) => setSelectedCompany(d))
                          .finally(() => setDetailLoading(false))
                      }
                    }}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${c.cc ?? '#607D8B'}20`, border: `2px solid ${c.cc ?? '#607D8B'}40` }}
                      >
                        <Users className="h-4 w-4" style={{ color: c.cc ?? '#607D8B' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.title}</p>
                        <p className="text-[10px] text-muted-foreground">{c.co}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {searchResults.products.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Products ({searchResults.products.length})
              </h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {searchResults.products.slice(0, 8).map((p) => (
                  <Card
                    key={p.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors rounded-none sm:rounded-xl"
                    onClick={() => {
                      const cid = (p as Product & { company_id?: string }).company_id
                      if (cid) {
                        setDetailLoading(true)
                        fetch(`/api/b2b/multinational/companies/${cid}`)
                          .then((r) => r.json())
                          .then((d) => setSelectedCompany(d))
                          .finally(() => setDetailLoading(false))
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <p className="font-semibold text-sm truncate">{p.name}</p>
                        <StatusBadge status={p.status_badge ?? '—'} />
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{p.co} · {p.therapeutic_area}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{p.indication}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Partners ({companies.length})
      </h4>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-primary/50 transition-all rounded-none sm:rounded-xl overflow-hidden group"
              onClick={() => openCompanyDetail(c)}
            >
              <div
                className="absolute end-0 top-0 w-20 h-20 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none"
                style={{ backgroundColor: c.accent_color ?? '#607D8B' }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt="" className="h-10 w-10 rounded object-contain" />
                  ) : (
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded shrink-0"
                      style={{ backgroundColor: `${c.accent_color ?? '#607D8B'}20` }}
                    >
                      <Building2 className="h-5 w-5" style={{ color: c.accent_color ?? '#607D8B' }} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{c.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {c.ticker ?? c.country} {c.hq ? `· ${c.hq}` : ''}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {c.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">{c.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="rounded-lg bg-muted/50 px-2 py-1.5">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Revenue</p>
                    <p className="text-xs font-bold">{c.revenue ?? '—'}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 px-2 py-1.5">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Focus</p>
                    <p className="text-xs font-bold truncate">{c.focus_areas?.[0] ?? '—'}</p>
                  </div>
                </div>
                {Array.isArray(c.focus_areas) && c.focus_areas.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {c.focus_areas.slice(0, 3).map((f) => (
                      <span
                        key={f}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${c.accent_color ?? '#607D8B'}18`, color: c.accent_color ?? '#607D8B' }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    View details
                  </span>
                  <span className="text-xs font-semibold flex items-center gap-1" style={{ color: c.accent_color ?? '#607D8B' }}>
                    View Details <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedCompany || detailLoading} onOpenChange={(open) => !open && setSelectedCompany(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-none sm:rounded-xl">
          {detailLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedCompany && co ? (
            <>
              <DialogHeader>
                <Button variant="ghost" size="sm" className="absolute start-2 top-2" onClick={() => setSelectedCompany(null)}>
                  <ArrowLeft className="h-4 w-4 me-1" />
                  Back
                </Button>
                <div className="pt-8">
                  <div className="flex items-start gap-4">
                    {co.logo_url ? (
                      <img src={co.logo_url} alt="" className="h-14 w-14 rounded object-contain" />
                    ) : (
                      <div
                        className="h-14 w-14 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${accent}20` }}
                      >
                        <Building2 className="h-7 w-7" style={{ color: accent }} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="text-xl">{co.name}</DialogTitle>
                      <DialogDescription className="text-sm">{co.ticker}</DialogDescription>
                      <p className="text-sm text-muted-foreground mt-1">{co.description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                    {[
                      { l: 'HQ', v: co.hq },
                      { l: 'Founded', v: co.founded },
                      { l: 'Revenue', v: co.revenue },
                      { l: 'Market Cap', v: (co as any).market_cap },
                      { l: 'Employees', v: (co as any).employees },
                      { l: 'R&D', v: (co as any).rd_spend },
                    ].map((x) => (
                      <div key={x.l} className="rounded-lg bg-muted/50 px-2 py-1.5">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{x.l}</p>
                        <p className="text-xs font-semibold">{x.v ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                  {Array.isArray(co.focus_areas) && co.focus_areas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {co.focus_areas.map((f) => (
                        <span
                          key={f}
                          className="text-[10px] font-medium px-2.5 py-1 rounded-full border"
                          style={{ backgroundColor: `${accent}15`, color: accent, borderColor: `${accent}40` }}
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </DialogHeader>

              <Tabs value={detailTab} onValueChange={(v) => setDetailTab(v as typeof detailTab)} className="mt-4">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="contacts">Contacts ({selectedCompany.contacts.length})</TabsTrigger>
                  <TabsTrigger value="products">Products ({selectedCompany.products.length})</TabsTrigger>
                  <TabsTrigger value="collab">Collaborate</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Card className="rounded-none sm:rounded-xl">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm" style={{ color: accent }}>Top Products</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        {selectedCompany.products.filter((p: Product) => p.is_highlighted).slice(0, 5).map((p: Product) => (
                          <div key={p.id} className="flex justify-between items-center py-1.5 border-b last:border-0">
                            <div>
                              <p className="font-semibold text-sm">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.therapeutic_area} — {p.indication}</p>
                            </div>
                            <StatusBadge status={p.status_badge ?? '—'} />
                          </div>
                        ))}
                        {selectedCompany.products.filter((p: Product) => p.is_highlighted).length === 0 && (
                          <p className="text-sm text-muted-foreground">No highlighted products</p>
                        )}
                      </CardContent>
                    </Card>
                    <Card className="rounded-none sm:rounded-xl">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm" style={{ color: accent }}>Key Executives</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        {selectedCompany.contacts.slice(0, 6).map((c: Contact) => (
                          <div key={c.id} className="flex items-center gap-2 py-1.5 border-b last:border-0">
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${accent}20` }}
                            >
                              <Users className="h-4 w-4" style={{ color: accent }} />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.title}</p>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                  {Array.isArray(co.collaboration_opportunities) && co.collaboration_opportunities.length > 0 && (
                    <Card className="rounded-none sm:rounded-xl">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm" style={{ color: accent }}>Collaboration Opportunities</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          {co.collaboration_opportunities.map((a) => (
                            <span
                              key={a}
                              className="text-xs px-2.5 py-1 rounded-lg border"
                              style={{ backgroundColor: `${accent}10`, borderColor: `${accent}30` }}
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="contacts" className="mt-4">
                  <Input
                    placeholder="Search contacts..."
                    value={detailSearch}
                    onChange={(e) => setDetailSearch(e.target.value)}
                    className="mb-4"
                  />
                  <div className="grid sm:grid-cols-2 gap-3">
                    {filteredContacts.map((c: Contact) => (
                      <Card key={c.id} className="rounded-none sm:rounded-xl hover:border-primary/30 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 border-2"
                              style={{ backgroundColor: `${accent}20`, borderColor: `${accent}40` }}
                            >
                              <Users className="h-5 w-5" style={{ color: accent }} />
                            </div>
                            <div>
                              <p className="font-bold">{c.name}</p>
                              <p className="text-xs" style={{ color: accent }}>{c.title}</p>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>🏢 {c.department}</p>
                            {c.email && (
                              <a href={`mailto:${c.email}`} className="text-primary hover:underline flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {c.email}
                              </a>
                            )}
                            {c.year_since && <p>📅 Since {c.year_since}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {filteredContacts.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">No contacts found</p>
                  )}
                </TabsContent>

                <TabsContent value="products" className="mt-4">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <Input
                      placeholder="Search products..."
                      value={detailSearch}
                      onChange={(e) => setDetailSearch(e.target.value)}
                      className="flex-1 max-w-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncProducts(co.id)}
                      disabled={syncingProducts}
                    >
                      {syncingProducts ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 me-1" />}
                      Sync from openFDA
                    </Button>
                  </div>
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Area</TableHead>
                          <TableHead>Indication</TableHead>
                          <TableHead className="hidden md:table-cell">Sales</TableHead>
                          <TableHead>Growth</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((p: Product) => (
                          <TableRow key={p.id} className={p.is_highlighted ? 'bg-muted/30' : ''}>
                            <TableCell>
                              <div>
                                <p className="font-semibold">{p.name}</p>
                                {p.generic_name && <p className="text-xs text-muted-foreground">{p.generic_name}</p>}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm" style={{ color: accent }}>{p.therapeutic_area}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{p.indication}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm">{p.sales ?? '—'}</TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  'text-sm font-medium',
                                  p.growth?.startsWith('+') || p.growth === 'Rapid' ? 'text-emerald-600' : '',
                                  p.growth?.startsWith('-') ? 'text-red-600' : ''
                                )}
                              >
                                {p.growth ?? '—'}
                              </span>
                            </TableCell>
                            <TableCell><StatusBadge status={p.status_badge ?? '—'} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredProducts.length === 0 && (
                    <p className="text-center py-8 text-muted-foreground">No products yet. Click Sync from openFDA to fetch.</p>
                  )}
                </TabsContent>

                <TabsContent value="collab" className="mt-4">
                  <CompanyCollabTab
                    company={co}
                    contacts={selectedCompany.contacts}
                    onPropose={() => { openProposalDialog(co); setSelectedCompany(null) }}
                  />
                </TabsContent>
              </Tabs>

              <div className="pt-4 border-t flex gap-2">
                {co.website && (
                  <a href={co.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    <Globe className="h-4 w-4" /> Website
                  </a>
                )}
                {co.business_development_url && (
                  <a href={co.business_development_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    <ExternalLink className="h-4 w-4" /> Business Development
                  </a>
                )}
                <Button className="ms-auto" onClick={() => { openProposalDialog(co); setSelectedCompany(null) }}>
                  <Send className="h-4 w-4 me-2" />
                  Propose collaboration
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!proposalCompany} onOpenChange={(open) => !open && setProposalCompany(null)}>
        <DialogContent className="sm:max-w-md rounded-none sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Propose collaboration</DialogTitle>
            <DialogDescription>
              Link {proposalCompany?.name} to a project. You can send the proposal later or mark it as sent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title} ({p.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projects.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">Create a project first in My Projects.</p>
              )}
            </div>
            <div>
              <Label>Status</Label>
              <Select value={proposalStatus} onValueChange={(v) => setProposalStatus(v as 'draft' | 'sent')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposalCompany(null)}>
              Cancel
            </Button>
            <Button onClick={createProposal} disabled={creatingProposal || !selectedProjectId || projects.length === 0}>
              {creatingProposal ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              Create proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CompanyCollabTab({ company, contacts, onPropose }: { company: Company; contacts: Contact[]; onPropose: () => void }) {
  const [areas, setAreas] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const [saved, setSaved] = useState(false)
  const opps = company.collaboration_opportunities ?? []
  const accent = company.accent_color ?? '#607D8B'
  const primaryEmail = contacts[0]?.email ?? ''

  const toggleArea = (a: string) => {
    setAreas((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))
  }

  const openEmail = () => {
    const subject = `Collaboration - ${areas.length ? areas.join(', ') : company.short_name ?? company.name}`
    const body = msg || `Collaboration proposal for ${company.name}`
    window.open(`mailto:${primaryEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`)
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Propose collaboration with {company.short_name ?? company.name}</h4>
      <p className="text-sm text-muted-foreground">Select areas and draft your proposal.</p>

      {opps.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground">Areas of interest</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {opps.map((a) => {
              const sel = areas.includes(a)
              return (
                <Button
                  key={a}
                  variant={sel ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleArea(a)}
                  style={sel ? { backgroundColor: accent, borderColor: accent } : {}}
                >
                  {sel ? '✓ ' : ''}{a}
                </Button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <Label className="text-xs text-muted-foreground">Proposal message</Label>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder={`Dear ${company.short_name ?? company.name} team,\n\nWriting from [Company] in Algeria to explore collaboration in...\n\nWe are interested in...`}
          className="w-full min-h-[120px] p-3 rounded-lg border bg-background text-sm resize-y mt-2"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
        >
          {saved ? '✓ Saved!' : 'Save draft'}
        </Button>
        <Button variant="outline" onClick={openEmail} style={{ borderColor: accent, color: accent }}>
          <Mail className="h-4 w-4 me-1" />
          Email
        </Button>
        <Button onClick={onPropose}>
          <Send className="h-4 w-4 me-1" />
          Propose
        </Button>
      </div>
    </div>
  )
}
