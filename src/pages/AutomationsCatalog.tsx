import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FuturisticBackground } from "@/components/FuturisticBackground";
import { CustomAutomationSection } from "@/components/CustomAutomationSection";
import { AutomationCard } from "@/components/AutomationCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { categories, type AutomationCategory, type Automation } from "@/data/automations";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

const ITEMS_PER_PAGE = 100;

export default function AutomationsCatalog() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [automationDates, setAutomationDates] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<AutomationCategory[]>([]);
  const [selectedRoiLevels, setSelectedRoiLevels] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Load automations on mount and subscribe to real-time updates
  useEffect(() => {
    const loadAutomations = async () => {
      try {
        // Fetch all automations from database (paginate to bypass 1000 limit)
        let allAutomations: any[] = [];
        let page = 0;
        const pageSize = 1000;
        
        while (true) {
          const { data, error } = await supabase
            .from("automations")
            .select("*")
            .range(page * pageSize, (page + 1) * pageSize - 1);
          
          if (error) {
            console.error('Error fetching DB automations:', error);
            break;
          }
          
          if (!data || data.length === 0) break;
          allAutomations = [...allAutomations, ...data];
          if (data.length < pageSize) break;
          page++;
        }
        
        // Track last_updated dates from DB automations
        const dates: Record<string, string> = {};
        allAutomations.forEach(dbAuto => {
          dates[dbAuto.id] = dbAuto.last_updated;
        });
        setAutomationDates(dates);
        
        // Convert DB automations to the Automation format
        const automationsList: Automation[] = allAutomations.map(dbAuto => ({
          id: dbAuto.id,
          name: dbAuto.name,
          description: dbAuto.description || '',
          category: dbAuto.category as AutomationCategory,
          hoursSaved: 20,
          monthlySavings: dbAuto.price * 2.5,
          setupTime: '24-48 hours',
          roiLevel: 'medium' as const,
          tools: [],
          thumbnail: '/placeholder.svg',
          features: dbAuto.features || [],
          problemStatement: '',
          solution: dbAuto.description || '',
          useCases: [],
          requirements: [],
          workflowSteps: [],
          isN8NWorkflow: false,
        }));
        
        console.log(`✅ Loaded ${automationsList.length} automations from database`);
        setAutomations(automationsList);
      } catch (error) {
        console.error('❌ Failed to load automations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAutomations();

    // Subscribe to real-time changes on automations table
    const channel = supabase
      .channel('automations-catalog-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'automations',
        },
        (payload) => {
          console.log('🔄 Automations table changed:', payload.eventType);
          // Reload automations when changes occur
          loadAutomations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredAutomations = automations.filter((automation) => {
    // Normalize category strings aggressively to handle any hidden characters
    const normalizeCategory = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z&]/g, ""); // keep only letters and &

    const automationCategory = normalizeCategory(automation.category);

    const categoryMatch =
      selectedCategories.length === 0 ||
      selectedCategories.some(
        (selected) => normalizeCategory(selected) === automationCategory
      );

    const roiMatch =
      selectedRoiLevels.length === 0 ||
      selectedRoiLevels.includes(automation.roiLevel);

    // Search filter - check name, description, category, and tools
    const searchMatch =
      searchQuery === "" ||
      automation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      automation.description
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      automation.category
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      automation.tools.some((tool) =>
        tool.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return categoryMatch && roiMatch && searchMatch;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredAutomations.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedAutomations = filteredAutomations.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategories, selectedRoiLevels, searchQuery]);

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedRoiLevels([]);
    setSearchQuery("");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <FuturisticBackground />
      <Header />
      
      <main className="flex-1 container mx-auto px-4 pt-32 pb-12">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-lg text-muted-foreground">Loading automations...</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-4">Automation Catalog</h1>
              <p className="text-lg text-muted-foreground mb-6">
                Browse our library of AI-powered automations. Each saves you 10-80 hours per month.
              </p>
              
              {/* Custom Automation Section */}
              <div className="mb-8">
                <CustomAutomationSection />
              </div>
              
              {/* Search Bar */}
              <div className="relative max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, category, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
            </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <div className="lg:sticky lg:top-24 space-y-6 bg-card p-4 rounded-lg lg:bg-transparent lg:p-0">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Filters</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetFilters}
                    className="h-auto p-1 text-sm"
                  >
                    Reset
                  </Button>
                </div>
                <Separator />
              </div>

              <div>
                <h4 className="font-medium mb-3">Category</h4>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setSelectedCategories(prev => [...prev, category]);
                          } else {
                            setSelectedCategories(prev => prev.filter(c => c !== category));
                          }
                        }}
                      />
                      <Label
                        htmlFor={`category-${category}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3">ROI Level</h4>
                <div className="space-y-2">
                  {["high", "medium", "low"].map((level) => (
                    <div key={level} className="flex items-center space-x-2">
                      <Checkbox
                        id={`roi-${level}`}
                        checked={selectedRoiLevels.includes(level)}
                        onCheckedChange={(checked) => {
                          if (checked === true) {
                            setSelectedRoiLevels(prev => [...prev, level]);
                          } else {
                            setSelectedRoiLevels(prev => prev.filter(l => l !== level));
                          }
                        }}
                      />
                      <Label
                        htmlFor={`roi-${level}`}
                        className="text-sm font-normal cursor-pointer capitalize"
                      >
                        {level}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredAutomations.length)} of {filteredAutomations.length} automations
                {filteredAutomations.length !== automations.length && (
                  <span> (filtered from {automations.length} total)</span>
                )}
              </p>
              {totalPages > 1 && (
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedAutomations.map((automation) => (
                <AutomationCard
                  key={automation.id}
                  automation={automation}
                  lastUpdated={automationDates[automation.id]}
                />
              ))}
            </div>

            {filteredAutomations.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No automations match your filters.</p>
                <Button onClick={resetFilters} className="mt-4">
                  Reset Filters
                </Button>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
        </>
        )}
      </main>

      <Footer />
    </div>
  );
}
