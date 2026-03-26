import { useState } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";

import { Button } from "./ui/button";
import { TrendingUp, DollarSign, Clock, Zap } from "lucide-react";
import { Link } from "react-router-dom";
interface ROICalculatorProps {
  variant?: "default" | "compact";
  prefilledAutomations?: number;
  prefilledHours?: number;
}
const ROICalculator = ({
  variant = "default",
  prefilledAutomations,
  prefilledHours
}: ROICalculatorProps) => {
  const [numAutomations, setNumAutomations] = useState(prefilledAutomations || 3);
  const [avgHours, setAvgHours] = useState(prefilledHours || 20);
  const [hourlyRate, setHourlyRate] = useState(75);

  // Tiered pricing based on quantity
  const getTierPrice = (quantity: number) => {
    if (quantity === 1) return 99;
    if (quantity >= 2 && quantity <= 3) return 89;
    if (quantity >= 4 && quantity <= 6) return 79;
    if (quantity >= 7 && quantity <= 10) return 69;
    return 59; // 11+
  };
  
  const effectivePricePerAutomation = getTierPrice(numAutomations);
  const basePrice = 99;
  const discountRate = (basePrice - effectivePricePerAutomation) / basePrice;
  const monthlyCost = numAutomations * effectivePricePerAutomation;

  // Savings calculations
  const monthlyHoursSaved = numAutomations * avgHours;
  const monthlyDollarSavings = monthlyHoursSaved * hourlyRate;
  const netMonthlyGain = monthlyDollarSavings - monthlyCost;
  const roiMultiple = monthlyCost > 0 ? (monthlyDollarSavings / monthlyCost).toFixed(1) : "0";
  const annualNetGain = netMonthlyGain * 12;
  const isCompact = variant === "compact";
  return <Card className={`${isCompact ? 'p-6' : 'p-8 md:p-12'} glass tech-border-animate shadow-neon`}>
      <div className={`grid ${isCompact ? 'grid-cols-1 gap-6' : 'grid-cols-1 md:grid-cols-5 gap-8'}`}>
        {/* Inputs Panel */}
        <div className={`space-y-6 ${isCompact ? '' : 'md:col-span-2'}`}>
          <div>
            <h3 className={`font-bold mb-2 ${isCompact ? 'text-lg' : 'text-xl'}`}>Calculate Your ROI</h3>
            <p className="text-sm text-muted-foreground">See what you get back every month</p>
          </div>

          {/* Number of Automations */}
          <div className="space-y-3">
            <Label htmlFor="automations">Number of Automations</Label>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setNumAutomations(Math.max(1, numAutomations - 1))} className="h-10 w-10">
                -
              </Button>
              <Input id="automations" type="number" value={numAutomations} onChange={e => setNumAutomations(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} className="text-center h-10" min={1} max={10} />
              <Button variant="outline" size="icon" onClick={() => setNumAutomations(Math.min(10, numAutomations + 1))} className="h-10 w-10">
                +
              </Button>
            </div>
          </div>

          {/* Hours Saved Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label>Hours Saved Per Automation/Month</Label>
              <span className="text-sm font-medium">{avgHours}h</span>
            </div>
            <Slider value={[avgHours]} onValueChange={values => setAvgHours(values[0])} min={5} max={80} step={5} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5h</span>
              <span>80h</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="rate">Value of Your Time ($/hour)</Label>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">$</span>
              <Input 
                id="rate" 
                type="text" 
                inputMode="numeric"
                value={hourlyRate} 
                onChange={e => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value === '') {
                    setHourlyRate(0);
                  } else {
                    setHourlyRate(parseInt(value, 10));
                  }
                }}
                onBlur={e => {
                  if (hourlyRate < 1) setHourlyRate(1);
                }}
                className="h-10" 
              />
            </div>
            <p className="text-xs text-muted-foreground">Typical founder/knowledge worker: $50-$150/hr</p>
          </div>
        </div>

        {/* Results Panel */}
        <div className={`space-y-4 ${isCompact ? 'pt-4 border-t border-border' : 'md:col-span-3 flex flex-col justify-center'}`}>
          <div className={`p-6 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 ${isCompact ? '' : 'md:p-8'}`}>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Your Monthly ROI</span>
            </div>
            
            <div className="mb-4 sm:mb-6">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-2">
                ${netMonthlyGain.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">Estimated Savings</p>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 mb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs">Monthly Cost</span>
                </div>
                <div className="text-base sm:text-lg font-semibold">
                  ${monthlyCost.toLocaleString()}
                  {discountRate > 0 && <span className="ml-2 text-xs text-accent">-{(discountRate * 100).toFixed(0)}%</span>}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">Hours Saved</span>
                </div>
                <div className="text-base sm:text-lg font-semibold">{monthlyHoursSaved}h/mo</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs">Monthly Savings</span>
                </div>
                <div className="text-base sm:text-lg font-semibold">${monthlyDollarSavings.toLocaleString()}</div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs">ROI Multiple</span>
                </div>
                <div className="text-base sm:text-lg font-semibold">{roiMultiple}x</div>
              </div>
            </div>

              <div className="pt-4 border-t border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Annual Estimated Savings</span>
                  <span className="text-xl sm:text-2xl font-bold text-primary">${annualNetGain.toLocaleString()}</span>
                </div>
              </div>

            <p className="text-xs text-muted-foreground mt-4">
              Estimates based on your inputs. Actual impact varies by workflow.
            </p>
          </div>

          <div className={`${isCompact ? 'text-sm' : ''}`}>
            <p className="text-muted-foreground mb-3">
              With this setup, your automations pay for themselves in the first week — then keep printing ~${netMonthlyGain.toLocaleString()}/month in pure time savings.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="gradient-primary shadow-glow flex-1" asChild>
                <Link to="/build-my-stack">Build My Stack</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>;
};
export default ROICalculator;