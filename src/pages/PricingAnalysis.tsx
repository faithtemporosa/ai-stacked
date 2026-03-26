// @ts-nocheck
import { useState } from "react";
import { exportPricingAnalysisPDF } from "@/utils/exportPricingAnalysisPDF";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileDown, ArrowLeft, Loader2 } from "lucide-react";

export default function PricingAnalysis() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = () => {
    setIsGenerating(true);
    try {
      exportPricingAnalysisPDF();
    } finally {
      setTimeout(() => setIsGenerating(false), 500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Pricing Cost Analysis</h1>
        <p className="text-muted-foreground">Download the complete tool pricing and cost analysis PDF.</p>
        
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
