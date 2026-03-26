import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Database, Download } from "lucide-react";
import { seedAutomationsDatabase } from "@/utils/seedAutomations";
import { downloadAutomationsCSV } from "@/utils/exportAutomationsCSV";
import { parseAutomationsCatalog } from "@/utils/parseAutomationsCatalog";

export default function SeedAutomations() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ successCount: number; errorCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [automationCount, setAutomationCount] = useState<number>(0);

  useEffect(() => {
    parseAutomationsCatalog().then(automations => {
      setAutomationCount(automations.length);
    });
  }, []);

  const handleSeed = async () => {
    setIsSeeding(true);
    setError(null);
    setResult(null);
    setProgress(0);

    // Simulate progress (actual progress would need to be tracked in the seed function)
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 95));
    }, 200);

    try {
      const seedResult = await seedAutomationsDatabase();
      setProgress(100);
      setResult(seedResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed automations');
    } finally {
      clearInterval(interval);
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              Seed Automations Database
            </CardTitle>
            <CardDescription>
              Populate the database with all {automationCount} automation templates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                This will insert or update all automation templates in the database. 
                Existing automations with the same ID will be updated.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 gap-3">
              <Button 
                onClick={downloadAutomationsCSV}
                variant="outline"
                size="lg"
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Download CSV Export
              </Button>

              {!result && !error && (
                <Button 
                  onClick={handleSeed} 
                  disabled={isSeeding}
                  size="lg"
                  className="w-full"
                >
                  {isSeeding ? 'Seeding Database...' : 'Start Seeding'}
                </Button>
              )}
            </div>

            {isSeeding && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  Processing automations... {progress}%
                </p>
              </div>
            )}

            {result && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold text-green-900 dark:text-green-100">
                      Seeding Complete!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✓ Successfully inserted: {result.successCount} automations
                    </p>
                    {result.errorCount > 0 && (
                      <p className="text-sm text-orange-600">
                        ⚠ Failed: {result.errorCount} automations
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {result && (
              <Button 
                onClick={() => {
                  setResult(null);
                  setProgress(0);
                }}
                variant="outline"
                className="w-full"
              >
                Reset
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
