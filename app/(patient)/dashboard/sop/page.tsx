'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Save,
  Download,
  Menu,
  FileText,
  Sparkles,
  X,
  RefreshCw,
  Send,
} from 'lucide-react'
import { initialSopData, type SopData } from './initial-sop-data'

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  FileText,
  Calendar: FileText,
  ClipboardList: FileText,
  Wallet: FileText,
  XCircle: FileText,
  RotateCcw: FileText,
  CreditCard: FileText,
  Stethoscope: FileText,
  Package: FileText,
  GraduationCap: FileText,
  Brain: FileText,
  Bell: FileText,
  Shield: FileText,
  MessageSquare: FileText,
  Briefcase: FileText,
  Building2: FileText,
}

function getIcon(iconName: string) {
  const Icon = iconMap[iconName] ?? FileText
  return <Icon size={16} />
}

export default function SOPEditorPage() {
  const [sopData, setSopData] = useState<SopData>(initialSopData)
  const [activeSection, setActiveSection] = useState(initialSopData.sections[0]?.id ?? '1')
  const [showSidebar, setShowSidebar] = useState(true)
  const [showAI, setShowAI] = useState(false)
  const [aiMessages, setAiMessages] = useState<Array<{ role: string; content: string }>>([
    {
      role: 'assistant',
      content:
        "Hello! I'm your SOP AI Assistant. I can help you:\n\n• Add new sections or content\n• Expand on specific topics\n• Generate tables and workflows\n• Review and improve existing content\n• Answer questions about the SOP\n\nWhat would you like to work on?",
    },
  ])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [exportStatus, setExportStatus] = useState('')
  const aiChatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (aiChatRef.current) {
      aiChatRef.current.scrollTop = aiChatRef.current.scrollHeight
    }
  }, [aiMessages])

  const toggleSection = (id: string) => {
    setSopData((p) => ({
      ...p,
      sections: p.sections.map((s) => (s.id === id ? { ...s, collapsed: !s.collapsed } : s)),
    }))
  }

  const updateContent = (sid: string, subid: string, field: string, val: string) => {
    setSopData((p) => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id === sid
          ? {
              ...s,
              subsections: s.subsections.map((sub) =>
                sub.id === subid ? { ...sub, [field]: val } : sub
              ),
            }
          : s
      ),
    }))
    setUnsavedChanges(true)
  }

  const updateSectionTitle = (id: string, title: string) => {
    setSopData((p) => ({
      ...p,
      sections: p.sections.map((s) => (s.id === id ? { ...s, title } : s)),
    }))
    setUnsavedChanges(true)
  }

  const addSection = () => {
    const newId = String(sopData.sections.length + 1)
    setSopData((p) => ({
      ...p,
      sections: [
        ...p.sections,
        {
          id: newId,
          title: 'New Section',
          icon: 'FileText',
          collapsed: false,
          subsections: [{ id: `${newId}.1`, title: 'New Subsection', content: '' }],
        },
      ],
    }))
    setActiveSection(newId)
    setUnsavedChanges(true)
  }

  const addSubsection = (sid: string) => {
    setSopData((p) => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id === sid
          ? {
              ...s,
              collapsed: false,
              subsections: [
                ...s.subsections,
                {
                  id: `${sid}.${s.subsections.length + 1}`,
                  title: 'New Subsection',
                  content: '',
                },
              ],
            }
          : s
      ),
    }))
    setUnsavedChanges(true)
  }

  const deleteSection = (id: string) => {
    if (confirm('Delete this section?')) {
      setSopData((p) => ({ ...p, sections: p.sections.filter((s) => s.id !== id) }))
      setUnsavedChanges(true)
    }
  }

  const deleteSubsection = (sid: string, subid: string) => {
    if (confirm('Delete this subsection?')) {
      setSopData((p) => ({
        ...p,
        sections: p.sections.map((s) =>
          s.id === sid ? { ...s, subsections: s.subsections.filter((sub) => sub.id !== subid) } : s
        ),
      }))
      setUnsavedChanges(true)
    }
  }

  const updateTableCell = (sid: string, subid: string, ri: number, ci: number, val: string) => {
    setSopData((p) => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id === sid
          ? {
              ...s,
              subsections: s.subsections.map((sub) => {
                if (sub.id === subid && sub.table) {
                  const rows = [...sub.table.rows]
                  rows[ri] = [...rows[ri]]
                  rows[ri][ci] = val
                  return { ...sub, table: { ...sub.table, rows } }
                }
                return sub
              }),
            }
          : s
      ),
    }))
    setUnsavedChanges(true)
  }

  const updateTableHeader = (sid: string, subid: string, ci: number, val: string) => {
    setSopData((p) => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id === sid
          ? {
              ...s,
              subsections: s.subsections.map((sub) => {
                if (sub.id === subid && sub.table) {
                  const headers = [...sub.table.headers]
                  headers[ci] = val
                  return { ...sub, table: { ...sub.table, headers } }
                }
                return sub
              }),
            }
          : s
      ),
    }))
    setUnsavedChanges(true)
  }

  const addTableRow = (sid: string, subid: string) => {
    setSopData((p) => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id === sid
          ? {
              ...s,
              subsections: s.subsections.map((sub) =>
                sub.id === subid && sub.table
                  ? {
                      ...sub,
                      table: {
                        ...sub.table,
                        rows: [...sub.table.rows, sub.table.headers.map(() => '')],
                      },
                    }
                  : sub
              ),
            }
          : s
      ),
    }))
    setUnsavedChanges(true)
  }

  const deleteTableRow = (sid: string, subid: string, ri: number) => {
    setSopData((p) => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id === sid
          ? {
              ...s,
              subsections: s.subsections.map((sub) =>
                sub.id === subid && sub.table
                  ? { ...sub, table: { ...sub.table, rows: sub.table.rows.filter((_, i) => i !== ri) } }
                  : sub
              ),
            }
          : s
      ),
    }))
    setUnsavedChanges(true)
  }

  const addTable = (sid: string, subid: string) => {
    setSopData((p) => ({
      ...p,
      sections: p.sections.map((s) =>
        s.id === sid
          ? {
              ...s,
              subsections: s.subsections.map((sub) =>
                sub.id === subid && !sub.table
                  ? {
                      ...sub,
                      table: {
                        headers: ['Column 1', 'Column 2', 'Column 3'],
                        rows: [['', '', '']],
                      },
                    }
                  : sub
              ),
            }
          : s
      ),
    }))
    setUnsavedChanges(true)
  }

  const handleAISubmit = async () => {
    if (!aiInput.trim() || aiLoading) return
    const userMessage = aiInput.trim()
    setAiMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setAiInput('')
    setAiLoading(true)

    try {
      const messagesForApi = aiMessages
        .filter((m, i) => m.role !== 'assistant' || i !== 0)
        .concat([{ role: 'user', content: userMessage }])
        .map((m) => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/sop-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesForApi }),
      })
      const data = (await response.json()) as { content?: string; error?: string }
      const reply =
        data.content ?? data.error ?? "I couldn't process that request. Please try again."
      setAiMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setAiMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection error. Please check your network and try again.' },
      ])
    }
    setAiLoading(false)
  }

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(sopData, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `Health_Platform_SOP_v${sopData.version}.json`
    a.click()
    setExportStatus('JSON exported!')
    setTimeout(() => setExportStatus(''), 2000)
  }

  const exportPDF = () => {
    setExportStatus('Generating PDF...')
    const printContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${sopData.title} - SOP v${sopData.version}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.5; color: #1a1a2e; font-size: 10pt; }
    .cover { page-break-after: always; padding: 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .section { margin-bottom: 16px; }
    .section-header { background: #1a1a2e; color: white; padding: 8px 12px; font-weight: 600; margin-bottom: 8px; }
    .subsection { padding: 8px 0; border-bottom: 1px solid #eee; }
    .subsection h3 { color: #667eea; font-size: 11pt; margin-bottom: 6px; }
    .content { white-space: pre-wrap; color: #444; font-size: 9.5pt; }
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-top: 6px; }
    th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; }
    th { background: #f1f5f9; font-weight: 600; }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${sopData.title}</h1>
    <h2>${sopData.subtitle}</h2>
    <p>Version ${sopData.version} | ${sopData.lastUpdated}</p>
  </div>
  ${sopData.sections
    .map(
      (s) => `
    <div class="section">
      <div class="section-header">${s.id}. ${s.title}</div>
      ${s.subsections
        .map(
          (sub) => `
        <div class="subsection">
          <h3>${sub.id} ${sub.title}</h3>
          <div class="content">${(sub.content ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          ${
            sub.table
              ? `<table><thead><tr>${sub.table.headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${sub.table.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
              : ''
          }
        </div>
      `
        )
        .join('')}
    </div>
  `
    )
    .join('')}
</body>
</html>`
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      setExportStatus('PDF ready! Use "Save as PDF" in print dialog')
      setTimeout(() => setExportStatus(''), 4000)
    } else {
      setExportStatus('Please allow popups to export PDF')
      setTimeout(() => setExportStatus(''), 3000)
    }
  }

  const filteredSections = sopData.sections.filter(
    (s) =>
      !searchTerm ||
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.subsections.some(
        (sub) =>
          sub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (sub.content ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      )
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      {/* Sidebar */}
      <div
        className={`${showSidebar ? 'w-72' : 'w-0'} bg-white border-r shadow-lg transition-all duration-300 overflow-hidden flex flex-col`}
      >
        <div className="p-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700">
          <h2 className="font-bold text-white flex items-center gap-2 text-lg">
            <FileText size={22} />
            SOP Navigator
          </h2>
          <p className="text-indigo-200 text-xs mt-1">
            v{sopData.version} • {sopData.sections.length} sections
          </p>
        </div>
        <div className="p-3 border-b bg-slate-50">
          <input
            type="text"
            placeholder="🔍 Search sections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filteredSections.map((s) => (
            <div key={s.id} className="mb-1">
              <button
                type="button"
                onClick={() => {
                  setActiveSection(s.id)
                  toggleSection(s.id)
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-all ${
                  activeSection === s.id
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                {s.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span className={activeSection === s.id ? 'text-indigo-600' : 'text-slate-400'}>
                  {getIcon(s.icon)}
                </span>
                <span className="truncate font-medium">
                  {s.id}. {s.title}
                </span>
              </button>
              {!s.collapsed && (
                <div className="ml-8 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-3">
                  {s.subsections.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() =>
                        document.getElementById(`sub-${sub.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                      className="w-full text-left px-2 py-1.5 rounded text-xs text-slate-500 hover:bg-slate-50 hover:text-indigo-600 truncate transition-colors"
                    >
                      {sub.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="p-3 border-t bg-slate-50">
          <button
            type="button"
            onClick={addSection}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-medium shadow-md"
          >
            <Plus size={16} />
            Add Section
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu size={20} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-800">{sopData.title}</h1>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Version {sopData.version}</span>
                <span>•</span>
                <span>{sopData.lastUpdated}</span>
                {unsavedChanges && (
                  <span className="text-amber-600 font-semibold animate-pulse">• Unsaved changes</span>
                )}
                {exportStatus && (
                  <span className="text-green-600 font-semibold">{exportStatus}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAI(!showAI)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                showAI ? 'bg-purple-600 text-white shadow-md' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              <Sparkles size={16} />
              AI Assistant
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1" />
            <button
              type="button"
              onClick={exportJSON}
              className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Export as JSON (backup)"
            >
              <Save size={14} />
              Backup
            </button>
            <button
              type="button"
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2.5 text-sm bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 rounded-lg transition-all shadow-md font-medium"
            >
              <Download size={16} />
              Download PDF
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="w-full space-y-6">
              {sopData.sections.map((section) => (
                <div
                  key={section.id}
                  id={`section-${section.id}`}
                  className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.id)}
                        className="text-white/70 hover:text-white transition-colors"
                      >
                        {section.collapsed ? (
                          <ChevronRight size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                      </button>
                      <span className="text-white/60">{getIcon(section.icon)}</span>
                      <span className="text-white/40 font-mono text-sm">{section.id}.</span>
                      {editingId === section.id ? (
                        <input
                          value={section.title}
                          onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                          onBlur={() => setEditingId(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                          autoFocus
                          className="bg-white/20 text-white font-semibold px-3 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                        />
                      ) : (
                        <h2
                          onClick={() => setEditingId(section.id)}
                          className="text-white font-semibold cursor-pointer hover:underline text-lg"
                        >
                          {section.title}
                        </h2>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => addSubsection(section.id)}
                        className="p-2 text-white/60 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                        title="Add subsection"
                      >
                        <Plus size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSection(section.id)}
                        className="p-2 text-white/60 hover:text-red-300 hover:bg-white/20 rounded-lg transition-colors"
                        title="Delete section"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  {!section.collapsed && (
                    <div className="divide-y divide-slate-100">
                      {section.subsections.map((sub) => (
                        <div
                          key={sub.id}
                          id={`sub-${sub.id}`}
                          className="p-5 hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-indigo-600 font-mono text-xs bg-indigo-50 px-2 py-1 rounded-md font-semibold">
                                {sub.id}
                              </span>
                              {editingId === sub.id ? (
                                <input
                                  value={sub.title}
                                  onChange={(e) =>
                                    updateContent(section.id, sub.id, 'title', e.target.value)
                                  }
                                  onBlur={() => setEditingId(null)}
                                  onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                                  autoFocus
                                  className="font-semibold text-slate-800 px-2 py-1 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              ) : (
                                <h3
                                  onClick={() => setEditingId(sub.id)}
                                  className="font-semibold text-slate-800 cursor-pointer hover:text-indigo-600 transition-colors"
                                >
                                  {sub.title}
                                </h3>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {!sub.table && (
                                <button
                                  type="button"
                                  onClick={() => addTable(section.id, sub.id)}
                                  className="px-2 py-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded text-xs font-medium transition-colors"
                                >
                                  + Table
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteSubsection(section.id, sub.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <textarea
                            value={sub.content ?? ''}
                            onChange={(e) =>
                              updateContent(section.id, sub.id, 'content', e.target.value)
                            }
                            placeholder="Add content..."
                            rows={Math.max(4, (sub.content ?? '').split('\n').length + 2)}
                            className="w-full p-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y font-mono leading-relaxed"
                          />
                          {sub.table && (
                            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr>
                                    {sub.table.headers.map((h, i) => (
                                      <th
                                        key={i}
                                        className="bg-slate-100 border-b border-slate-200 px-3 py-2.5 text-left font-semibold text-slate-700"
                                      >
                                        <input
                                          value={h}
                                          onChange={(e) =>
                                            updateTableHeader(section.id, sub.id, i, e.target.value)
                                          }
                                          className="w-full bg-transparent focus:outline-none font-semibold"
                                        />
                                      </th>
                                    ))}
                                    <th className="bg-slate-100 border-b border-slate-200 w-10" />
                                  </tr>
                                </thead>
                                <tbody>
                                  {sub.table.rows.map((row, ri) => (
                                    <tr key={ri} className="hover:bg-slate-50 transition-colors">
                                      {row.map((cell, ci) => (
                                        <td
                                          key={ci}
                                          className="border-b border-slate-100 px-3 py-2"
                                        >
                                          <input
                                            value={cell}
                                            onChange={(e) =>
                                              updateTableCell(
                                                section.id,
                                                sub.id,
                                                ri,
                                                ci,
                                                e.target.value
                                              )
                                            }
                                            placeholder="..."
                                            className="w-full bg-transparent focus:outline-none text-slate-700"
                                          />
                                        </td>
                                      ))}
                                      <td className="border-b border-slate-100 px-2 text-center">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            deleteTableRow(section.id, sub.id, ri)
                                          }
                                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <button
                                type="button"
                                onClick={() => addTableRow(section.id, sub.id)}
                                className="w-full py-2 flex items-center justify-center gap-1 text-xs text-indigo-600 hover:bg-indigo-50 transition-colors"
                              >
                                <Plus size={12} /> Add row
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {showAI && (
            <div className="w-96 bg-white border-l shadow-lg flex flex-col">
              <div className="px-4 py-3 border-b bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Sparkles size={18} />
                  AI Assistant
                </div>
                <button
                  type="button"
                  onClick={() => setShowAI(false)}
                  className="p-1 text-white/70 hover:text-white rounded transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div ref={aiChatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {aiMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-md'
                          : 'bg-slate-100 text-slate-800 rounded-bl-md'
                      }`}
                    >
                      <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-slate-600 flex items-center gap-2">
                      <RefreshCw size={14} className="animate-spin" />
                      Thinking...
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 border-t bg-slate-50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAISubmit()}
                    placeholder="Ask AI to help..."
                    className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleAISubmit}
                    disabled={!aiInput.trim() || aiLoading}
                    className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">
                  AI can help add content, create tables, and improve sections
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
