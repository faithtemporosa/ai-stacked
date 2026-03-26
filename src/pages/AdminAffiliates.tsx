// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { DollarSign, Users, TrendingUp, CheckCircle, XCircle, Clock, Loader2, ArrowLeft, Eye } from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';

interface Affiliate {
  id: string;
  user_id: string;
  referral_code: string;
  status: string;
  total_earnings: number;
  pending_earnings: number;
  paid_earnings: number;
  total_referrals: number;
  commission_rate: number;
  paypal_email: string | null;
  created_at: string;
  application_reason: string | null;
  applied_at: string | null;
  approved_at: string | null;
  profiles?: { email: string; username: string | null };
}

interface Commission {
  id: string;
  affiliate_id: string;
  payment_amount: number;
  commission_amount: number;
  status: string;
  payment_type: string;
  created_at: string;
  commission_expires_at: string | null;
  affiliates?: { referral_code: string; user_id: string };
}

interface Payout {
  id: string;
  affiliate_id: string;
  amount: number;
  status: string;
  payout_method: string;
  payout_details: any;
  admin_notes: string | null;
  requested_at: string;
  processed_at: string | null;
  affiliates?: { referral_code: string; paypal_email: string | null; user_id: string };
}

export default function AdminAffiliates() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [payoutAction, setPayoutAction] = useState<'paid' | 'rejected'>('paid');
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkAdminAndFetchData();
    }
  }, [user]);

  const checkAdminAndFetchData = async () => {
    try {
      const { data: adminCheck } = await supabase.rpc('has_role', {
        _user_id: user!.id,
        _role: 'admin'
      });

      if (!adminCheck) {
        navigate('/');
        return;
      }

      setIsAdmin(true);
      await fetchAllData();
    } catch (error) {
      console.error('Error checking admin:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const getValidSession = async () => {
    // First try to get current session
    let { data: { session } } = await supabase.auth.getSession();
    
    // If no session or token might be expired, try to refresh
    if (!session) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        toast.error('Session expired. Please log in again.');
        navigate('/admin/login');
        return null;
      }
      session = refreshData.session;
    }
    
    return session;
  };

  const fetchAllData = async (retryCount = 0) => {
    const session = await getValidSession();
    if (!session) return;

    try {
      const [affiliatesRes, commissionsRes, payoutsRes] = await Promise.all([
        supabase.functions.invoke('affiliate-api', {
          body: { action: 'admin_get_all_affiliates' },
          headers: { Authorization: `Bearer ${session.access_token}` }
        }),
        supabase.functions.invoke('affiliate-api', {
          body: { action: 'admin_get_all_commissions' },
          headers: { Authorization: `Bearer ${session.access_token}` }
        }),
        supabase.functions.invoke('affiliate-api', {
          body: { action: 'admin_get_pending_payouts' },
          headers: { Authorization: `Bearer ${session.access_token}` }
        })
      ]);

      // Check for 401 errors and retry with refreshed session
      const hasAuthError = [affiliatesRes, commissionsRes, payoutsRes].some(
        res => res.error?.message?.includes('401') || res.error?.status === 401
      );
      
      if (hasAuthError && retryCount < 1) {
        // Force refresh session and retry once
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData.session) {
          return fetchAllData(retryCount + 1);
        }
      }

      if (affiliatesRes.data?.affiliates) setAffiliates(affiliatesRes.data.affiliates);
      if (commissionsRes.data?.commissions) setCommissions(commissionsRes.data.commissions);
      if (payoutsRes.data?.payouts) setPayouts(payoutsRes.data.payouts);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load affiliate data');
    }
  };

  const handleApproveAffiliate = async (affiliateId: string) => {
    try {
      const session = await getValidSession();
      if (!session) return;

      const response = await supabase.functions.invoke('affiliate-api', {
        body: { 
          action: 'admin_approve_affiliate',
          affiliate_id: affiliateId
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) throw response.error;

      toast.success('Affiliate approved!');
      setSelectedAffiliate(null);
      fetchAllData();
    } catch (error: any) {
      console.error('Error approving affiliate:', error);
      toast.error(error.message || 'Failed to approve');
    }
  };

  const handleRejectAffiliate = async (affiliateId: string) => {
    try {
      const session = await getValidSession();
      if (!session) return;

      const response = await supabase.functions.invoke('affiliate-api', {
        body: { 
          action: 'admin_reject_affiliate',
          affiliate_id: affiliateId
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) throw response.error;

      toast.success('Affiliate rejected');
      setSelectedAffiliate(null);
      fetchAllData();
    } catch (error: any) {
      console.error('Error rejecting affiliate:', error);
      toast.error(error.message || 'Failed to reject');
    }
  };

  const handleProcessPayout = async () => {
    if (!selectedPayout) return;

    try {
      setIsProcessing(true);
      const session = await getValidSession();
      if (!session) return;

      const response = await supabase.functions.invoke('affiliate-api', {
        body: { 
          action: 'admin_process_payout',
          payout_id: selectedPayout.id,
          status: payoutAction,
          admin_notes: adminNotes
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (response.error) throw response.error;

      toast.success(`Payout ${payoutAction === 'paid' ? 'approved' : 'rejected'}`);
      setSelectedPayout(null);
      setAdminNotes('');
      fetchAllData();
    } catch (error: any) {
      console.error('Error processing payout:', error);
      toast.error(error.message || 'Failed to process payout');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Active</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Pending Review</Badge>;
      case 'paid':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Stats
  const pendingApplications = affiliates.filter(a => a.status === 'pending').length;
  const activeAffiliates = affiliates.filter(a => a.status === 'active').length;
  const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0);
  const pendingPayouts = payouts.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount), 0);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <>
      <AdminHeader />
      <main className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold mb-8">Affiliate Management</h1>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pending Applications</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                {pendingApplications}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Affiliates</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                {activeAffiliates}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Commissions</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-500" />
                ${totalCommissions.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Payouts</CardDescription>
              <CardTitle className="text-2xl flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                ${pendingPayouts.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="applications" className="space-y-4">
          <TabsList>
            <TabsTrigger value="applications">
              Applications
              {pendingApplications > 0 && (
                <Badge className="ml-2 bg-yellow-500/20 text-yellow-500">{pendingApplications}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="affiliates">Active Affiliates</TabsTrigger>
            <TabsTrigger value="commissions">Commissions</TabsTrigger>
            <TabsTrigger value="payouts">
              Payouts
              {payouts.filter(p => p.status === 'pending').length > 0 && (
                <Badge className="ml-2 bg-yellow-500/20 text-yellow-500">
                  {payouts.filter(p => p.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applications">
            <Card>
              <CardHeader>
                <CardTitle>Pending Applications</CardTitle>
                <CardDescription>Review and approve affiliate applications</CardDescription>
              </CardHeader>
              <CardContent>
                {affiliates.filter(a => a.status === 'pending').length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending applications</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Applied</TableHead>
                        <TableHead>PayPal</TableHead>
                        <TableHead>Application Reason</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {affiliates.filter(a => a.status === 'pending').map((affiliate) => (
                        <TableRow key={affiliate.id}>
                          <TableCell>{affiliate.profiles?.email || 'N/A'}</TableCell>
                          <TableCell>{new Date(affiliate.applied_at || affiliate.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{affiliate.paypal_email || 'Not set'}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {affiliate.application_reason || 'No reason provided'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setSelectedAffiliate(affiliate)}>
                                <Eye className="w-4 h-4 mr-1" /> Review
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

          <TabsContent value="affiliates">
            <Card>
              <CardHeader>
                <CardTitle>Active Affiliates</CardTitle>
                <CardDescription>All approved affiliates</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Referral Code</TableHead>
                      <TableHead>Referrals</TableHead>
                      <TableHead>Total Earned</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Approved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {affiliates.filter(a => a.status === 'active').map((affiliate) => (
                      <TableRow key={affiliate.id}>
                        <TableCell>{affiliate.profiles?.email || 'N/A'}</TableCell>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-sm">{affiliate.referral_code}</code>
                        </TableCell>
                        <TableCell>{affiliate.total_referrals}</TableCell>
                        <TableCell className="text-green-500">${Number(affiliate.total_earnings).toFixed(2)}</TableCell>
                        <TableCell className="text-yellow-500">${Number(affiliate.pending_earnings).toFixed(2)}</TableCell>
                        <TableCell>{affiliate.approved_at ? new Date(affiliate.approved_at).toLocaleDateString() : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="commissions">
            <Card>
              <CardHeader>
                <CardTitle>Commission History</CardTitle>
                <CardDescription>25% commission for 1 year from referral date</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Affiliate</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell>{new Date(commission.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {commission.affiliates?.referral_code || 'N/A'}
                          </code>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <Card>
              <CardHeader>
                <CardTitle>Payout Requests</CardTitle>
                <CardDescription>Auto-generated every 60 days - review and process</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Affiliate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>PayPal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>{new Date(payout.requested_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {payout.affiliates?.referral_code || 'N/A'}
                          </code>
                        </TableCell>
                        <TableCell className="font-semibold">${Number(payout.amount).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">{payout.affiliates?.paypal_email || 'Not set'}</TableCell>
                        <TableCell>{getStatusBadge(payout.status)}</TableCell>
                        <TableCell>
                          {payout.status === 'pending' && (
                            <Button size="sm" onClick={() => setSelectedPayout(payout)}>Process</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Review Application Dialog */}
        <Dialog open={!!selectedAffiliate} onOpenChange={() => setSelectedAffiliate(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Application</DialogTitle>
              <DialogDescription>Review and approve or reject this affiliate application</DialogDescription>
            </DialogHeader>
            {selectedAffiliate && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{selectedAffiliate.profiles?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Applied</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedAffiliate.applied_at || selectedAffiliate.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">PayPal Email</label>
                  <p className="text-sm text-muted-foreground">{selectedAffiliate.paypal_email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Application Reason</label>
                  <p className="text-sm bg-muted p-3 rounded-md mt-1">
                    {selectedAffiliate.application_reason || 'No reason provided'}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setSelectedAffiliate(null)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={() => selectedAffiliate && handleRejectAffiliate(selectedAffiliate.id)}
              >
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </Button>
              <Button onClick={() => selectedAffiliate && handleApproveAffiliate(selectedAffiliate.id)}>
                <CheckCircle className="w-4 h-4 mr-2" /> Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Process Payout Dialog */}
        <Dialog open={!!selectedPayout} onOpenChange={() => setSelectedPayout(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Payout</DialogTitle>
              <DialogDescription>Review and approve or reject this payout request</DialogDescription>
            </DialogHeader>
            {selectedPayout && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Amount</label>
                    <p className="text-2xl font-bold text-green-500">${Number(selectedPayout.amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">PayPal Email</label>
                    <p className="text-sm">{selectedPayout.affiliates?.paypal_email || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button
                    variant={payoutAction === 'paid' ? 'default' : 'outline'}
                    onClick={() => setPayoutAction('paid')}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve & Pay
                  </Button>
                  <Button
                    variant={payoutAction === 'rejected' ? 'destructive' : 'outline'}
                    onClick={() => setPayoutAction('rejected')}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                </div>
                <div>
                  <label className="text-sm font-medium">Admin Notes (optional)</label>
                  <Textarea
                    placeholder="Add notes about this payout..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPayout(null)}>Cancel</Button>
              <Button onClick={handleProcessPayout} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </main>
    </>
  );
}
