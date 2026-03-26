import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Copy, DollarSign, Users, TrendingUp, Clock, CheckCircle, XCircle, Loader2, Calendar, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Affiliate {
  id: string;
  referral_code: string;
  status: string;
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  total_referrals: number;
  commission_rate: number;
  paypal_email: string | null;
  venmo_username: string | null;
  bank_account_name: string | null;
  bank_routing_number: string | null;
  bank_account_number: string | null;
  payout_method: string;
  created_at: string;
  application_reason: string | null;
  applied_at: string | null;
  approved_at: string | null;
  last_payout_date: string | null;
}

interface Commission {
  id: string;
  payment_amount: number;
  commission_amount: number;
  status: string;
  payment_type: string;
  created_at: string;
  paid_at: string | null;
  commission_expires_at: string | null;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  payout_method: string;
  requested_at: string;
  processed_at: string | null;
}

export default function AffiliateDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [referredCount, setReferredCount] = useState(0);
  const [nextPayoutDate, setNextPayoutDate] = useState<string | null>(null);
  const [payoutMethod, setPayoutMethod] = useState('paypal');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [venmoUsername, setVenmoUsername] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankRoutingNumber, setBankRoutingNumber] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [applicationReason, setApplicationReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAffiliateData();
    }
  }, [user]);

  const fetchAffiliateData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('affiliate-api', {
        body: { action: 'get_affiliate_stats' },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      // Check for "Not an affiliate" in various places
      const isNotAffiliate = 
        response.error?.message?.includes('Not an affiliate') ||
        response.data?.error === 'Not an affiliate' ||
        response.data?.isAffiliate === false;

      if (isNotAffiliate) {
        setAffiliate(null);
      } else if (response.error) {
        throw response.error;
      } else if (response.data?.affiliate) {
        setAffiliate(response.data.affiliate);
        setCommissions(response.data.commissions || []);
        setPayouts(response.data.payouts || []);
        setReferredCount(response.data.referredUsersCount || 0);
        setNextPayoutDate(response.data.nextPayoutDate || null);
        setPayoutMethod(response.data.affiliate?.payout_method || 'paypal');
        setPaypalEmail(response.data.affiliate?.paypal_email || '');
        setVenmoUsername(response.data.affiliate?.venmo_username || '');
        setBankAccountName(response.data.affiliate?.bank_account_name || '');
        setBankRoutingNumber(response.data.affiliate?.bank_routing_number || '');
        setBankAccountNumber(response.data.affiliate?.bank_account_number || '');
      } else {
        // No affiliate data found, show application form
        setAffiliate(null);
      }
    } catch (error) {
      console.error('Error fetching affiliate data:', error);
      // Don't show error toast for "not an affiliate" - just show the application form
      setAffiliate(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAffiliate = async () => {
    if (!applicationReason.trim()) {
      toast.error('Please tell us why you want to become an affiliate');
      return;
    }

    try {
      setIsApplying(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('affiliate-api', {
        body: { 
          action: 'apply_affiliate',
          application_reason: applicationReason,
          payout_method: payoutMethod,
          paypal_email: paypalEmail || null,
          venmo_username: venmoUsername || null,
          bank_account_name: bankAccountName || null,
          bank_routing_number: bankRoutingNumber || null,
          bank_account_number: bankAccountNumber || null
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) throw response.error;

      toast.success(response.data.message || 'Application submitted!');
      fetchAffiliateData();
    } catch (error: any) {
      console.error('Error applying:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setIsApplying(false);
    }
  };

  const handleUpdatePayoutDetails = async () => {
    // Validate based on selected method
    if (payoutMethod === 'paypal' && !paypalEmail) {
      toast.error('Please enter your PayPal email');
      return;
    }
    if (payoutMethod === 'venmo' && !venmoUsername) {
      toast.error('Please enter your Venmo username');
      return;
    }
    if (payoutMethod === 'bank' && (!bankAccountName || !bankRoutingNumber || !bankAccountNumber)) {
      toast.error('Please fill in all bank transfer details');
      return;
    }

    try {
      setIsUpdating(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('affiliate-api', {
        body: { 
          action: 'update_payout_details',
          payout_method: payoutMethod,
          paypal_email: paypalEmail || null,
          venmo_username: venmoUsername || null,
          bank_account_name: bankAccountName || null,
          bank_routing_number: bankRoutingNumber || null,
          bank_account_number: bankAccountNumber || null
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) throw response.error;

      toast.success('Payout details updated');
      fetchAffiliateData();
    } catch (error: any) {
      console.error('Error updating payout details:', error);
      toast.error(error.message || 'Failed to update payout details');
    } finally {
      setIsUpdating(false);
    }
  };

  const copyReferralLink = () => {
    if (!affiliate) return;
    const link = `${window.location.origin}/referral?ref=${affiliate.referral_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied to clipboard');
  };

  const copyReferralCode = () => {
    if (!affiliate) return;
    navigator.clipboard.writeText(affiliate.referral_code);
    toast.success('Referral code copied');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'paid':
        return <Badge variant="outline" className="text-green-500 border-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Paid</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-blue-500 border-blue-500"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'refunded':
      case 'cancelled':
        return <Badge variant="outline" className="text-red-500 border-red-500"><XCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Application form for non-affiliates
  if (!affiliate) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-28 pb-16">
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Affiliate Program</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
                Earn While You Share
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Join our affiliate program and earn <span className="text-primary font-semibold">25% recurring commission</span> for 
                every customer you refer. Your referrals save 10% too!
              </p>
            </div>

            {/* Benefits Cards */}
            <div className="grid gap-4 md:grid-cols-4 mb-12">
              <Card className="group relative overflow-hidden border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent hover:border-green-500/40 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-6 relative">
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <DollarSign className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">25% Commission</h3>
                  <p className="text-sm text-muted-foreground">Recurring for 12 months on every payment</p>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent hover:border-blue-500/40 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-6 relative">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">Auto Payouts</h3>
                  <p className="text-sm text-muted-foreground">Every 60 days with $50 minimum</p>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent hover:border-purple-500/40 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-6 relative">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users className="w-6 h-6 text-purple-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">Referral Discount</h3>
                  <p className="text-sm text-muted-foreground">Your referrals get 10% off</p>
                </CardContent>
              </Card>

              <Card className="group relative overflow-hidden border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent hover:border-orange-500/40 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-6 relative">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Clock className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">Quick Approval</h3>
                  <p className="text-sm text-muted-foreground">Within 24-48 hours</p>
                </CardContent>
              </Card>
            </div>

            {/* Earnings Calculator */}
            <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-1">Potential Earnings Example</h4>
                    <p className="text-muted-foreground">
                      Refer just <span className="font-semibold text-foreground">5 customers</span> who each subscribe to a $99/month automation bundle, 
                      and you could earn <span className="font-bold text-primary text-lg">$1,485</span> over 12 months!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Application Form */}
            <Card className="border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">Apply Now</CardTitle>
                <CardDescription>Fill out the form below to join our affiliate program</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-base font-medium">
                    Why do you want to become an affiliate? <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="Tell us about your audience, how you plan to promote our automations, and why you're interested in partnering with us..."
                    value={applicationReason}
                    onChange={(e) => setApplicationReason(e.target.value)}
                    rows={5}
                    className="resize-none text-base"
                  />
                  <p className="text-xs text-muted-foreground">
                    This helps us understand how we can best support your success
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-base font-medium">Preferred Payout Method</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPayoutMethod('paypal')}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        payoutMethod === 'paypal'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          payoutMethod === 'paypal' ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          <span className="text-lg font-bold text-[#003087]">P</span>
                        </div>
                        <div>
                          <p className="font-medium">PayPal</p>
                          <p className="text-xs text-muted-foreground">Fast & secure</p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutMethod('venmo')}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        payoutMethod === 'venmo'
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          payoutMethod === 'venmo' ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          <span className="text-lg font-bold text-[#3D95CE]">V</span>
                        </div>
                        <div>
                          <p className="font-medium">Venmo</p>
                          <p className="text-xs text-muted-foreground">Quick transfers</p>
                        </div>
                      </div>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">You can change this anytime after approval</p>
                </div>

                {payoutMethod === 'paypal' && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="paypal" className="text-base font-medium">PayPal Email</Label>
                    <Input
                      id="paypal"
                      type="email"
                      placeholder="your@paypal.email"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      className="text-base h-12"
                    />
                  </div>
                )}

                {payoutMethod === 'venmo' && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="venmo" className="text-base font-medium">Venmo Username</Label>
                    <Input
                      id="venmo"
                      placeholder="@yourusername"
                      value={venmoUsername}
                      onChange={(e) => setVenmoUsername(e.target.value)}
                      className="text-base h-12"
                    />
                  </div>
                )}

                <Button 
                  onClick={handleApplyAffiliate} 
                  className="w-full h-14 text-lg font-semibold" 
                  size="lg"
                  disabled={isApplying || !applicationReason.trim()}
                >
                  {isApplying ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting Application...</>
                  ) : (
                    <>Submit Application</>
                  )}
                </Button>
                
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Applications reviewed within 24-48 hours</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Pending application status
  if (affiliate.status === 'pending') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-28 pb-16">
          <div className="max-w-2xl mx-auto">
            {/* Status Badge */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-6">
                <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />
                <span className="text-sm font-medium text-yellow-500">Application Pending</span>
              </div>
            </div>

            {/* Main Card */}
            <Card className="border-yellow-500/20 shadow-lg overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500" />
              <CardHeader className="text-center pt-8 pb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-4 ring-yellow-500/10">
                  <Clock className="w-10 h-10 text-yellow-500" />
                </div>
                <CardTitle className="text-3xl font-bold">Application Under Review</CardTitle>
                <CardDescription className="text-lg mt-3 max-w-md mx-auto">
                  Thanks for applying! We're reviewing your application and will get back to you within 24-48 hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pb-8">
                {/* Timeline */}
                <div className="flex items-center justify-center gap-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">Submitted</span>
                  </div>
                  <div className="w-12 h-0.5 bg-yellow-500" />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center animate-pulse">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">In Review</span>
                  </div>
                  <div className="w-12 h-0.5 bg-muted" />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-muted-foreground">Approved</span>
                  </div>
                </div>

                {/* Application Details */}
                <Card className="bg-muted/30 border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">Your Application</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {affiliate.application_reason || 'No reason provided'}
                        </p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Submitted on {new Date(affiliate.applied_at || affiliate.created_at).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* What's Next */}
                <div className="text-center text-sm text-muted-foreground">
                  <p>We'll send you an email notification once your application has been reviewed.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Suspended status
  if (affiliate.status === 'suspended') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-28 pb-16">
          <div className="max-w-2xl mx-auto">
            {/* Status Badge */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-500">Application Not Approved</span>
              </div>
            </div>

            {/* Main Card */}
            <Card className="border-red-500/20 shadow-lg overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-red-500 via-rose-500 to-red-500" />
              <CardHeader className="text-center pt-8 pb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-red-500/20 to-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 ring-4 ring-red-500/10">
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
                <CardTitle className="text-3xl font-bold">Application Not Approved</CardTitle>
                <CardDescription className="text-lg mt-3 max-w-md mx-auto">
                  Unfortunately, your affiliate application was not approved at this time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pb-8">
                {/* Info Card */}
                <Card className="bg-muted/30 border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">What This Means</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Our team has reviewed your application and determined it doesn't meet our current criteria. 
                          This could be due to various factors, and we encourage you to reach out if you have questions.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Support */}
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Have questions about this decision? We're happy to help.
                  </p>
                  <Button variant="outline" className="gap-2" onClick={() => window.location.href = 'mailto:support@ai-stacked.com'}>
                    <AlertCircle className="w-4 h-4" />
                    Contact Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Active affiliate dashboard
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-36 pb-8">
        <h1 className="text-3xl font-bold mb-8">Affiliate Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Earnings</CardDescription>
              <CardTitle className="text-2xl text-green-500">
                ${Number(affiliate.total_earnings).toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Earnings</CardDescription>
              <CardTitle className="text-2xl text-yellow-500">
                ${Number(affiliate.pending_earnings).toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Paid Out</CardDescription>
              <CardTitle className="text-2xl text-blue-500">
                ${Number(affiliate.paid_earnings).toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Referrals</CardDescription>
              <CardTitle className="text-2xl">{referredCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Next Payout Info */}
        {nextPayoutDate && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-4 py-4">
              <Calendar className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">Next Automatic Payout</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(nextPayoutDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <Badge className="ml-auto">Every 60 days</Badge>
            </CardContent>
          </Card>
        )}

        {/* PayPal Warning */}
        {!affiliate.paypal_email && (
          <Card className="mb-8 border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="font-medium">PayPal Email Required</p>
                <p className="text-sm text-muted-foreground">
                  Add your PayPal email in Settings to receive automatic payouts
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Referral Link Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Referral Link</CardTitle>
            <CardDescription>
              Share this link - referrals get 10% off their first purchase, you earn 25% for 1 year!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                readOnly 
                value={`${window.location.origin}/auth?ref=${affiliate.referral_code}`}
                className="font-mono text-sm"
              />
              <Button onClick={copyReferralLink} variant="outline">
                <Copy className="w-4 h-4 mr-2" /> Copy Link
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Referral Code:</span>
              <code className="bg-muted px-3 py-1 rounded font-mono">{affiliate.referral_code}</code>
              <Button onClick={copyReferralCode} variant="ghost" size="sm">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="commissions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="commissions">
            <Card>
              <CardHeader>
                <CardTitle>Commission History</CardTitle>
                <CardDescription>25% commission on each payment for 1 year from referral date</CardDescription>
              </CardHeader>
              <CardContent>
                {commissions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No commissions yet. Share your referral link to start earning!
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Payment Amount</TableHead>
                        <TableHead>Commission (25%)</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell>
                            {new Date(commission.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="capitalize">{commission.payment_type}</TableCell>
                          <TableCell>${Number(commission.payment_amount).toFixed(2)}</TableCell>
                          <TableCell className="font-semibold text-green-500">
                            ${Number(commission.commission_amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {commission.commission_expires_at 
                              ? new Date(commission.commission_expires_at).toLocaleDateString()
                              : '-'
                            }
                          </TableCell>
                          <TableCell>{getStatusBadge(commission.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Payout History</CardTitle>
                  <CardDescription>Automatic payouts every 60 days (minimum $50)</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {payouts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No payouts yet. Payouts are processed automatically every 60 days.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Processed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell>
                            {new Date(payout.requested_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${Number(payout.amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="capitalize">{payout.payout_method}</TableCell>
                          <TableCell>{getStatusBadge(payout.status)}</TableCell>
                          <TableCell>
                            {payout.processed_at 
                              ? new Date(payout.processed_at).toLocaleDateString()
                              : '-'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Payout Settings</CardTitle>
                <CardDescription>Configure how you receive automatic payouts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Payout Method</Label>
                  <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payout method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {payoutMethod === 'paypal' && (
                  <div className="space-y-2">
                    <Label htmlFor="paypal">PayPal Email *</Label>
                    <Input
                      id="paypal"
                      type="email"
                      placeholder="your@paypal.email"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                    />
                  </div>
                )}

                {payoutMethod === 'venmo' && (
                  <div className="space-y-2">
                    <Label htmlFor="venmo">Venmo Username *</Label>
                    <Input
                      id="venmo"
                      type="text"
                      placeholder="@your-venmo-username"
                      value={venmoUsername}
                      onChange={(e) => setVenmoUsername(e.target.value)}
                    />
                  </div>
                )}


                <p className="text-xs text-muted-foreground">
                  Required to receive automatic payouts every 60 days (minimum $50)
                </p>

                <Button onClick={handleUpdatePayoutDetails} disabled={isUpdating}>
                  {isUpdating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
