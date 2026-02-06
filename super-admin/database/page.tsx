"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database, Table as TableIcon, RefreshCw, Download, Upload, Trash2, AlertTriangle, CheckCircle, Edit, Plus, ChevronLeft, ChevronRight, Eye } from "lucide-react"
import { LoadingSpinner } from '@/components/ui/page-loading'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface TableInfo {
  name: string
  count: number
}

export default function DatabaseManagement() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [sqlQuery, setSqlQuery] = useState("")
  const [queryResult, setQueryResult] = useState<any>(null)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [executing, setExecuting] = useState(false)
  
  // Table browser state
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [tableData, setTableData] = useState<any[]>([])
  const [tableColumns, setTableColumns] = useState<string[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [editingRow, setEditingRow] = useState<any | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newRowData, setNewRowData] = useState<any>({})

  const supabase = createBrowserClient()

  const tableNames = [
    'profiles',
    'doctors',
    'clinics',
    'laboratories',
    'pharmacies',
    'ambulances',
    'appointments',
    'prescriptions',
    'reviews',
    'professionals',
    'favorites',
    'notifications'
  ]

  useEffect(() => {
    fetchTableCounts()
  }, [])

  const fetchTableCounts = async () => {
    setLoading(true)
    const counts: TableInfo[] = []
    
    for (const tableName of tableNames) {
      const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true })
      counts.push({ name: tableName, count: count || 0 })
    }
    
    setTables(counts)
    setLoading(false)
  }

  const refreshTable = async (tableName: string) => {
    setRefreshing(tableName)
    const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true })
    setTables(prev => prev.map(t => t.name === tableName ? { ...t, count: count || 0 } : t))
    setRefreshing(null)
  }

  const clearTable = async (tableName: string) => {
    if (!confirm(`Are you sure you want to delete ALL data from ${tableName}? This cannot be undone!`)) return
    if (!confirm(`FINAL WARNING: This will permanently delete all records from ${tableName}. Type the table name to confirm.`)) return
    
    const confirmation = prompt(`Type "${tableName}" to confirm deletion:`)
    if (confirmation !== tableName) {
      alert('Table name does not match. Operation cancelled.')
      return
    }
    
    await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    refreshTable(tableName)
  }

  const executeQuery = async () => {
    if (!sqlQuery.trim()) return
    setExecuting(true)
    setQueryError(null)
    setQueryResult(null)
    
    try {
      // Simple SELECT query parser
      const selectMatch = sqlQuery.match(/SELECT\s+\*\s+FROM\s+(\w+)/i)
      const countMatch = sqlQuery.match(/SELECT\s+COUNT\(\*\)\s+FROM\s+(\w+)/i)
      
      if (selectMatch) {
        const tableName = selectMatch[1]
        const { data, error } = await supabase.from(tableName).select('*').limit(100)
        if (error) throw error
        setQueryResult({ type: 'select', data, count: data?.length })
      } else if (countMatch) {
        const tableName = countMatch[1]
        const { count, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true })
        if (error) throw error
        setQueryResult({ type: 'count', count })
      } else {
        setQueryError('Only SELECT * FROM table and SELECT COUNT(*) FROM table queries are supported for safety.')
      }
    } catch (err: any) {
      setQueryError(err.message || 'Query execution failed')
    }
    
    setExecuting(false)
  }

  const browseTable = async (tableName: string) => {
    setSelectedTable(tableName)
    setPage(0)
    loadTableData(tableName, 0)
  }

  const loadTableData = async (tableName: string, pageNum: number) => {
    setLoadingData(true)
    const pageSize = 50
    const from = pageNum * pageSize
    const to = from + pageSize - 1
    
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setTableData(data || [])
      setTotalCount(count || 0)
      if (data && data.length > 0) {
        setTableColumns(Object.keys(data[0]))
      }
    } catch (err) {
      console.error('Error loading table data:', err)
      alert('Failed to load table data')
    }
    
    setLoadingData(false)
  }

  const handleEditRow = (row: any) => {
    setEditingRow({ ...row })
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedTable || !editingRow) return
    
    try {
      const { error } = await supabase
        .from(selectedTable)
        .update(editingRow)
        .eq('id', editingRow.id)
      
      if (error) throw error
      alert('Row updated successfully!')
      loadTableData(selectedTable, page)
      setIsEditModalOpen(false)
    } catch (err: any) {
      alert(`Failed to update: ${err.message}`)
    }
  }

  const handleDeleteRow = async (rowId: string) => {
    if (!selectedTable) return
    if (!confirm('Delete this row? This cannot be undone!')) return
    
    try {
      const { error } = await supabase
        .from(selectedTable)
        .delete()
        .eq('id', rowId)
      
      if (error) throw error
      alert('Row deleted successfully!')
      loadTableData(selectedTable, page)
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`)
    }
  }

  const handleAddRow = () => {
    setNewRowData({})
    setIsAddModalOpen(true)
  }

  const handleSaveNewRow = async () => {
    if (!selectedTable) return
    
    try {
      const { error } = await supabase
        .from(selectedTable)
        .insert([newRowData])
      
      if (error) throw error
      alert('Row added successfully!')
      loadTableData(selectedTable, page)
      setIsAddModalOpen(false)
    } catch (err: any) {
      alert(`Failed to add row: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Management</h1>
          <p className="text-muted-foreground">View and manage database tables</p>
        </div>
        <Button onClick={fetchTableCounts} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh All
        </Button>
      </div>

      <Tabs defaultValue="tables">
        <TabsList>
          <TabsTrigger value="tables">Tables Overview</TabsTrigger>
          <TabsTrigger value="browse">Browse Data</TabsTrigger>
          <TabsTrigger value="query">Query Tool</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Tables
              </CardTitle>
              <CardDescription>Overview of all database tables and record counts</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="lg" className="text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table Name</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tables.map(table => (
                      <TableRow key={table.name}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TableIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono">{table.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{table.count.toLocaleString()}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" /> Active
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => browseTable(table.name)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => refreshTable(table.name)}
                              disabled={refreshing === table.name}
                            >
                              <RefreshCw className={`h-4 w-4 ${refreshing === table.name ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-destructive"
                              onClick={() => clearTable(table.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="browse" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Browse Table Data
                  </CardTitle>
                  <CardDescription>
                    {selectedTable ? `Viewing data from: ${selectedTable}` : 'Select a table from Tables Overview to browse'}
                  </CardDescription>
                </div>
                {selectedTable && (
                  <Button onClick={handleAddRow}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Row
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedTable ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a table from the Tables Overview tab and click the eye icon to browse data</p>
                </div>
              ) : loadingData ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" className="text-muted-foreground" />
                </div>
              ) : tableData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No data in this table</p>
                  <Button onClick={handleAddRow} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Row
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border rounded-lg overflow-auto max-h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {tableColumns.slice(0, 8).map(col => (
                            <TableHead key={col} className="font-mono text-xs">{col}</TableHead>
                          ))}
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableData.map((row, i) => (
                          <TableRow key={i}>
                            {tableColumns.slice(0, 8).map(col => (
                              <TableCell key={col} className="font-mono text-xs max-w-[200px]">
                                <div className="truncate" title={String(row[col] || '')}>
                                  {typeof row[col] === 'object' && row[col] !== null
                                    ? JSON.stringify(row[col])
                                    : typeof row[col] === 'boolean'
                                    ? row[col] ? '✓ true' : '✗ false'
                                    : String(row[col] || '')}
                                </div>
                              </TableCell>
                            ))}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEditRow(row)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => handleDeleteRow(row.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {page * 50 + 1} to {Math.min((page + 1) * 50, totalCount)} of {totalCount} rows
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newPage = page - 1
                          setPage(newPage)
                          loadTableData(selectedTable, newPage)
                        }}
                        disabled={page === 0}
                        className="bg-transparent"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {page + 1} of {Math.ceil(totalCount / 50)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newPage = page + 1
                          setPage(newPage)
                          loadTableData(selectedTable, newPage)
                        }}
                        disabled={(page + 1) * 50 >= totalCount}
                        className="bg-transparent"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="query" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SQL Query Tool</CardTitle>
              <CardDescription>Execute read-only queries against the database (SELECT only for safety)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="SELECT * FROM profiles LIMIT 10" 
                  value={sqlQuery}
                  onChange={e => setSqlQuery(e.target.value)}
                  className="font-mono"
                />
                <Button onClick={executeQuery} disabled={executing}>
                  {executing ? <LoadingSpinner size="sm" /> : 'Execute'}
                </Button>
              </div>

              {queryError && (
                <div className="p-4 bg-destructive/10 border border-destructive rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <p className="text-destructive text-sm">{queryError}</p>
                </div>
              )}

              {queryResult && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {queryResult.type === 'count' ? `Count: ${queryResult.count}` : `${queryResult.count} rows returned`}
                    </Badge>
                  </div>
                  {queryResult.type === 'select' && queryResult.data && (
                    <div className="border rounded-lg overflow-auto max-h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(queryResult.data[0] || {}).slice(0, 6).map(key => (
                              <TableHead key={key} className="font-mono text-xs">{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {queryResult.data.slice(0, 50).map((row: any, i: number) => (
                            <TableRow key={i}>
                              {Object.values(row).slice(0, 6).map((val: any, j: number) => (
                                <TableCell key={j} className="font-mono text-xs max-w-[200px] truncate">
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val || '')}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Row Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Row</DialogTitle>
            <DialogDescription>Modify the values for this database row</DialogDescription>
          </DialogHeader>
          {editingRow && (
            <div className="space-y-4">
              {Object.keys(editingRow).map(key => (
                <div key={key} className="space-y-2">
                  <Label className="font-mono text-xs">{key}</Label>
                  {typeof editingRow[key] === 'boolean' ? (
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={editingRow[key] ? 'true' : 'false'}
                      onChange={(e) => setEditingRow({ ...editingRow, [key]: e.target.value === 'true' })}
                    >
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : typeof editingRow[key] === 'object' && editingRow[key] !== null ? (
                    <Textarea
                      value={JSON.stringify(editingRow[key], null, 2)}
                      onChange={(e) => {
                        try {
                          setEditingRow({ ...editingRow, [key]: JSON.parse(e.target.value) })
                        } catch (err) {
                          // Invalid JSON, keep as string for now
                        }
                      }}
                      className="font-mono text-xs"
                      rows={5}
                    />
                  ) : (
                    <Input
                      value={String(editingRow[key] || '')}
                      onChange={(e) => setEditingRow({ ...editingRow, [key]: e.target.value })}
                      className="font-mono text-xs"
                      disabled={key === 'id' || key === 'created_at'}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Row Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Row</DialogTitle>
            <DialogDescription>Enter values for the new database row (leave ID blank for auto-generation)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {tableColumns.filter(col => col !== 'id' && col !== 'created_at' && col !== 'updated_at').map(key => (
              <div key={key} className="space-y-2">
                <Label className="font-mono text-xs">{key}</Label>
                <Input
                  value={String(newRowData[key] || '')}
                  onChange={(e) => setNewRowData({ ...newRowData, [key]: e.target.value })}
                  className="font-mono text-xs"
                  placeholder={`Enter ${key}...`}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleSaveNewRow}>
              <Plus className="h-4 w-4 mr-2" />
              Add Row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
