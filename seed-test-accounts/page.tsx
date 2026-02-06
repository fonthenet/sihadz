"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, XCircle } from "lucide-react"
import { LoadingSpinner } from '@/components/ui/page-loading'

export default function SeedPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{ email: string; success: boolean; error?: string }[] | null>(null)
  const [password, setPassword] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSeed = async () => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const response = await fetch("/api/seed-test-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: "create-test-accounts-2026" }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to seed")
      }

      setResults(data.results)
      setPassword(data.password)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed accounts")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create Test Accounts</CardTitle>
            <CardDescription>
              This will create properly authenticated test accounts for patients, doctors, clinics, pharmacies, and labs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleSeed} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="me-2" />
                  Creating accounts...
                </>
              ) : (
                "Create Test Accounts"
              )}
            </Button>

            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                {error}
              </div>
            )}

            {password && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="font-medium">Password for all accounts:</p>
                <code className="text-lg font-mono">{password}</code>
              </div>
            )}

            {results && (
              <div className="space-y-2">
                <h3 className="font-medium">Results:</h3>
                {results.map((result) => (
                  <div
                    key={result.email}
                    className={`p-3 rounded-lg flex items-center gap-2 ${
                      result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span className="font-mono text-sm">{result.email}</span>
                    {result.error && <span className="text-xs ml-auto">{result.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
