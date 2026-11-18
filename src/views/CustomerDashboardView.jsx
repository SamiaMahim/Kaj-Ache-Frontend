import { useEffect, useState, useMemo } from 'react';
import { 
  ArrowUpRight, 
  BadgeCheck,
  CalendarDays, 
  CheckCircle2, 
  Heart, 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  Users, 
  Wallet, 
  Wrench,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../context/AuthContext';
import { fetchCustomerGigs, payGigSystemFee } from '../services/api';
import SystemFeePaymentModal from '../components/dashboard/SystemFeePaymentModal';
import SwalMessage from '../components/ui/SwalMessage';

export default function CustomerDashboardView() {
  const { t } = useLanguage();
  const { user, walletBalance, refreshAccount } = useAuth();

  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'active' | 'draft' | 'completed'
  const [selectedDraftGig, setSelectedDraftGig] = useState(null);
  const [payingFee, setPayingFee] = useState(false);

  // Promise callbacks (not synchronous setState) so this can run from an effect
  const loadCustomerData = () => fetchCustomerGigs()
    .then((customerGigs) => {
      setGigs(customerGigs || []);
      setError('');
    })
    .catch((loadError) => {
      setError(loadError.message || 'Failed to load your service requests.');
    })
    .finally(() => {
      setLoading(false);
      setRefreshing(false);
    });

  useEffect(() => {
    loadCustomerData();
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCustomerData(), refreshAccount()]);
  };

  const activeGigsCount = gigs.filter((gig) => !['completed', 'cancelled', 'draft'].includes(gig.status)).length;
  const draftGigsCount = gigs.filter((gig) => gig.status === 'draft').length;
  const completedGigsCount = gigs.filter((gig) => gig.status === 'completed').length;
  const totalBidsReceived = gigs.reduce((total, gig) => total + Number(gig.bidsCount || 0), 0);

  const filteredGigs = useMemo(() => {
    if (filterTab === 'active') {
      return gigs.filter((gig) => !['completed', 'cancelled', 'draft'].includes(gig.status));
    }
    if (filterTab === 'draft') {
      return gigs.filter((gig) => gig.status === 'draft');
    }
    if (filterTab === 'completed') {
      return gigs.filter((gig) => gig.status === 'completed');
    }
    return gigs;
  }, [gigs, filterTab]);

  const statusStyles = {
    draft: 'bg-green-100 text-green-900 border border-green-200 font-extrabold',
    bidding_open: 'bg-green-50 text-green-700 border border-green-100 font-bold',
    bid_selected: 'bg-violet-50 text-violet-700 border border-violet-100 font-bold',
    in_progress: 'bg-green-50 text-green-800 border border-green-100 font-bold',
    completed: 'bg-green-50 text-green-700 border border-green-100 font-bold',
    cancelled: 'bg-rose-50 text-rose-700 border border-rose-100 font-bold',
  };

  const handlePayDraftFee = async ({ paymentMethod, transactionId }) => {
    if (!selectedDraftGig) return;
    setPayingFee(true);
    setError('');
    try {
      await payGigSystemFee(selectedDraftGig._id, { paymentMethod, transactionId });
      setSelectedDraftGig(null);
      // Immediately refresh both gigs and wallet in AuthContext
      await Promise.all([loadCustomerData(), refreshAccount()]);
    } catch (payErr) {
      setError(payErr.message || 'Payment could not be processed.');
    } finally {
      setPayingFee(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        
        {/* Promotional Banner */}

        {/* Header Greeting */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-green-600">
                {t.dashboard?.customerTitle || 'Customer Portal'}
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
              Welcome, {user?.name || 'Customer'}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Manage your requested technician services, review incoming bids, and track work progress.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              aria-label="Refresh data"
              title="Refresh live data"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-green-600' : ''} />
              <span>{refreshing ? 'Syncing...' : 'Sync Live'}</span>
            </button>

            <Link
              to="/dashboard/customer/recruitment"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-green-600/20 transition hover:bg-green-700"
            >
              <BadgeCheck size={16} />
              <span>Recruitment Request</span>
              <ArrowUpRight size={15} />
            </Link>
            <Link
              to="/dashboard/customer/instant"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-green-700 transition hover:border-green-500"
            >
              <Zap size={16} />
              <span>Instant Service</span>
            </Link>
          </div>
        </div>

        {/* 4 Stat Cards Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Card 1: Active Gigs */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Requests</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <Wrench size={18} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-slate-900">{activeGigsCount}</p>
            <p className="mt-1 text-xs text-slate-500">
              {draftGigsCount > 0 ? `+${draftGigsCount} draft awaiting fee` : 'Live online for bids'}
            </p>
          </div>

          {/* Card 2: Account Wallet */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Account Wallet</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <Wallet size={18} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-green-700">৳{walletBalance}</p>
            <p className="mt-1 text-xs text-slate-500">Automatic refund guarantee</p>
          </div>

          {/* Card 3: Bids Received */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Bids Received</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                <Heart size={18} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-rose-600">{totalBidsReceived}</p>
            <p className="mt-1 text-xs text-slate-500">From verified technicians</p>
          </div>

          {/* Card 4: Completed Jobs */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Completed Jobs</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-teal-600">{completedGigsCount}</p>
            <p className="mt-1 text-xs text-slate-500">Successfully serviced</p>
          </div>

        </div>

        {/* Main Content Area */}
        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          
          {/* Posted Gigs List */}
          <div className="lg:col-span-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
              
              {/* Header & Filter Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Your Work Requests</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Click any service request to view bids and open technician chat</p>
                </div>

                <div className="flex flex-wrap p-1 bg-slate-100 rounded-xl border border-slate-200/60 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setFilterTab('all')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      filterTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    All ({gigs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('active')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      filterTab === 'active' ? 'bg-white text-green-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Active ({activeGigsCount})
                  </button>
                  {draftGigsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterTab('draft')}
                      className={`px-3 py-1.5 rounded-lg transition ${
                        filterTab === 'draft' ? 'bg-white text-green-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Drafts ({draftGigsCount})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFilterTab('completed')}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      filterTab === 'completed' ? 'bg-white text-green-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Done ({completedGigsCount})
                  </button>
                </div>
              </div>

              <SwalMessage message={error} />

              {/* Feed Content */}
              {loading ? (
                <div className="py-16 text-center text-sm font-semibold text-slate-500">
                  <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-green-500" />
                  <span>Loading your requests...</span>
                </div>
              ) : filteredGigs.length === 0 ? (
                <div className="py-14 text-center">
                  <Wrench size={32} className="mx-auto text-slate-300" />
                  <h3 className="mt-3 text-base font-black text-slate-800">
                    {filterTab === 'all' ? 'No work requests yet' : `No ${filterTab} requests`}
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                    Post your requirement with schedule and address to get competitive bids from nearby technicians.
                  </p>
                  <Link
                    to="/dashboard/customer/services"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-green-700"
                  >
                    <Plus size={14} />
                    <span>Post Your First Service Request</span>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredGigs.map((gig) => {
                    const isDraft = gig.status === 'draft';
                    const bidsCount = gig.bidsCount || (gig.bids ? gig.bids.length : 0);

                    return (
                      <div
                        key={gig._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 rounded-xl px-2 transition hover:bg-slate-50/60"
                      >
                        <Link to={`/dashboard/customer/gigs/${gig._id}`} className="min-w-0 flex-1 group">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                              {gig.service?.title || 'Service Request'}
                            </span>
                            <span className={`rounded-md px-2 py-0.5 text-[11px] ${statusStyles[gig.status] || 'bg-slate-100 text-slate-700'}`}>
                              {String(gig.status || 'Pending').replace(/_/g, ' ')}
                            </span>
                          </div>

                          <p className="mt-1.5 font-bold text-sm text-slate-900 group-hover:text-green-600 transition-colors truncate">
                            {gig.title || gig.service?.title || 'Work request'}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <CalendarDays size={12} className="text-slate-400" />
                              {gig.schedule?.date || 'Date not set'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Users size={12} className="text-slate-400" />
                              <strong className="text-slate-800">{bidsCount}</strong> {bidsCount === 1 ? 'bid' : 'bids'} received
                            </span>
                            <span>•</span>
                            <span className="font-bold text-slate-700">
                              Min: ৳{gig.minLimit || 0}
                            </span>
                          </div>
                        </Link>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {isDraft ? (
                            <button
                              type="button"
                              onClick={() => setSelectedDraftGig(gig)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-green-700"
                            >
                              <ShieldCheck size={14} />
                              <span>Place Online (Pay ৳{gig.systemFee || 50})</span>
                            </button>
                          ) : (
                            <Link
                              to={`/dashboard/customer/gigs/${gig._id}`}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-green-500 hover:text-green-600 shadow-2xs"
                            >
                              <span>View Details</span>
                              <ArrowUpRight size={13} />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>

          {/* Right Column: Customer Escrow & Support Card */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Post Card */}
            <div className="rounded-3xl bg-gradient-to-br from-green-600 to-teal-700 p-6 text-white shadow-xl shadow-green-600/10">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-md">
                <Plus size={20} />
              </div>
              <h3 className="mt-4 text-base font-black">Need a quick repair?</h3>
              <p className="mt-1 text-xs leading-relaxed text-green-100">
                Post your service request in under 2 minutes. Approved technicians submit bids with transparent arrival times.
              </p>
              <Link
                to="/dashboard/customer/services"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-bold text-green-800 transition hover:bg-green-50"
              >
                <Wrench size={14} />
                <span>Post a Request Now</span>
              </Link>
            </div>

            {/* Escrow Guarantee Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2.5 mb-3 text-green-700">
                <ShieldCheck size={20} />
                <h3 className="font-bold text-slate-900 text-sm">Customer Wallet Protection</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Any bid placement fee paid is held with an escrow guarantee. If your service request is cancelled or no technician is selected, the fee is <strong>100% refunded to your account wallet</strong> instantly.
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Wallet Balance:</span>
                <span className="font-black text-green-700 text-sm">৳{walletBalance}</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Draft Gig System Fee Payment Modal */}
      <SystemFeePaymentModal
        isOpen={Boolean(selectedDraftGig)}
        onClose={() => setSelectedDraftGig(null)}
        gig={selectedDraftGig}
        fee={selectedDraftGig?.systemFee || 50}
        onConfirm={handlePayDraftFee}
        submitting={payingFee}
      />
    </div>
  );
}
