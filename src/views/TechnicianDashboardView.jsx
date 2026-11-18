import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  MapPin,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  UserCheck,
  Wallet,
  Wrench,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { useAuth } from '../context/AuthContext';
import { fetchMatchingGigs, fetchTechnicianBids, fetchTechnicianDashboard } from '../services/api';

export default function TechnicianDashboardView() {
  const { t } = useLanguage();
  const { user, verificationStatus, refreshAccount } = useAuth();
  
  const [availableGigs, setAvailableGigs] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [stats, setStats] = useState({ earnings: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('opportunities'); // 'opportunities' | 'my-bids'

  const isApproved = verificationStatus === 'approved';
  const statusLabel = isApproved 
    ? 'Verified Pro' 
    : verificationStatus === 'rejected' 
      ? 'Verification Rejected' 
      : 'Verification Pending';

  // Promise callbacks (not synchronous setState) so this can run from an effect
  const loadDashboardData = () => Promise.all([
    fetchMatchingGigs(),
    fetchTechnicianBids(),
    // Earnings are non-critical; don't fail the whole page if this errors.
    fetchTechnicianDashboard().catch(() => null),
  ])
    .then(([gigsData, bidsData, dashboardData]) => {
      setAvailableGigs(gigsData || []);
      setMyBids(bidsData || []);
      if (dashboardData?.stats) setStats(dashboardData.stats);
      setError('');
    })
    .catch((err) => {
      setError(err.message || 'Failed to load live dashboard data.');
    })
    .finally(() => {
      setLoading(false);
      setRefreshing(false);
    });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), refreshAccount()]);
  };

  // Accepted bids logic
  const isAcceptedBid = (bid) => {
    if (bid.status === 'selected') return true;
    const bookingSelected = bid.booking?.selectedBid?._id || bid.booking?.selectedBid;
    return Boolean(bookingSelected && String(bookingSelected) === String(bid._id));
  };

  const acceptedBids = myBids.filter(isAcceptedBid);
  const pendingBids = myBids.filter((bid) => !isAcceptedBid(bid) && bid.status !== 'rejected');

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        
        {/* Promotional Alert Banner */}

        {/* Header Greeting & Controls */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-green-600">
                {t.dashboard?.technicianTitle || 'Technician Workspace'}
              </span>
              <span className="text-slate-300">•</span>
              <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                isApproved ? 'text-green-700' : 'text-slate-500'
              }`}>
                {isApproved ? <BadgeCheck size={14} /> : <ShieldAlert size={14} />}
                {statusLabel}
              </span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900">
              Welcome back, {user?.name || 'Technician'}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Review live customer requests in your service areas and manage your submitted bids.
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
              <span>{refreshing ? 'Updating...' : 'Sync Live'}</span>
            </button>

            <Link
              to="/dashboard/technician/gigs"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-green-500/20 transition hover:bg-green-700"
            >
              <BriefcaseBusiness size={16} />
              <span>Find Service Requests</span>
              <ArrowUpRight size={15} />
            </Link>
            <Link
              to="/dashboard/technician/instant"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-green-700 transition hover:border-green-500"
            >
              <Zap size={16} />
              <span>Instant Jobs</span>
            </Link>
            <Link
              to="/dashboard/technician/recruitment"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-green-700 transition hover:border-green-500"
            >
              <BadgeCheck size={16} />
              <span>{t.jobs.navRecruitmentTechnician}</span>
            </Link>
          </div>
        </div>

        {/* Realtime Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Card 0: Total Earnings */}
          <div className="rounded-2xl border border-green-200 bg-green-50/60 p-5 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-green-800">Total Earnings</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600 text-white">
                <Wallet size={18} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-green-700">৳{(stats.earnings || 0).toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-500">From {stats.completed || 0} completed {stats.completed === 1 ? 'job' : 'jobs'}</p>
          </div>
          
          {/* Card 1: Available Opportunities */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Open Requests</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <BriefcaseBusiness size={18} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-slate-900">{availableGigs.length}</p>
            <p className="mt-1 text-xs text-slate-500">Waiting for technician bids</p>
          </div>

          {/* Card 2: Active Bids Placed */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Bids Placed</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <Send size={18} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-green-600">{myBids.length}</p>
            <p className="mt-1 text-xs text-slate-500">{pendingBids.length} currently pending</p>
          </div>

          {/* Card 3: Accepted Jobs */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Jobs Won</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-green-600">{acceptedBids.length}</p>
            <p className="mt-1 text-xs text-slate-500">Selected by customer</p>
          </div>

        </div>

        {/* Accepted Assignments Spotlight */}
        {acceptedBids.length > 0 && (
          <div className="mt-6 rounded-3xl border border-green-200 bg-green-50/60 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 text-white shadow-xs">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-green-800">
                    Active Assignment
                  </span>
                  <h2 className="text-lg font-black text-slate-900">
                    Customer Selected Your Bid!
                  </h2>
                </div>
              </div>
              <span className="rounded-full bg-green-200/60 px-3 py-1 text-xs font-black text-green-900">
                {acceptedBids.length} Active {acceptedBids.length === 1 ? 'Job' : 'Jobs'}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {acceptedBids.map((bid) => {
                const gigId = bid.booking?._id || bid.booking;
                return (
                  <div
                    key={bid._id}
                    className="flex flex-col justify-between rounded-2xl border border-green-200 bg-white p-4 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                          {bid.booking?.title || bid.booking?.service?.title || 'Selected Work Request'}
                        </h3>
                        <span className="shrink-0 rounded-md bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800">
                          ৳{bid.price}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin size={13} className="text-slate-400" />
                        <span>{bid.booking?.location?.address || 'Dhaka'}</span>
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-xs font-semibold text-green-700 flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        P2P Chat Open
                      </span>
                      <Link
                        to={`/dashboard/technician/gigs/${gigId}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-green-700"
                      >
                        <MessageCircle size={14} />
                        <span>Open Chat</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Workspace Section */}
        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          
          {/* Main Feed: Nearby Opportunities vs My Bids */}
          <div className="lg:col-span-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs">
              
              {/* Tab Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setActiveTab('opportunities')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                      activeTab === 'opportunities'
                        ? 'bg-white text-green-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BriefcaseBusiness size={15} />
                    <span>Nearby Opportunities ({availableGigs.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('my-bids')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                      activeTab === 'my-bids'
                        ? 'bg-white text-green-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Send size={15} />
                    <span>My Placed Bids ({myBids.length})</span>
                  </button>
                </div>

                <Link
                  to="/dashboard/technician/gigs"
                  className="inline-flex items-center gap-1 text-xs font-bold text-green-600 hover:text-green-700 transition"
                >
                  View full service request market <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>

              {/* Feed Content */}
              {loading ? (
                <div className="py-16 text-center text-sm font-semibold text-slate-500">
                  <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-green-500" />
                  <span>Loading real-time marketplace data...</span>
                </div>
              ) : error ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold text-rose-600">{error}</p>
                  <button
                    type="button"
                    onClick={loadDashboardData}
                    className="mt-3 inline-flex rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white"
                  >
                    Retry
                  </button>
                </div>
              ) : activeTab === 'opportunities' ? (
                /* Tab 1: Available Opportunities */
                availableGigs.length === 0 ? (
                  <div className="py-14 text-center">
                    <BriefcaseBusiness size={32} className="mx-auto text-slate-300" />
                    <h3 className="mt-3 text-base font-black text-slate-800">No open service requests right now</h3>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                      Customers post new service requests daily. Keep your profile updated so matching requests appear here instantly.
                    </p>
                    <Link
                      to="/dashboard/technician/profile"
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                    >
                      <Wrench size={14} />
                      <span>Review Service Categories</span>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {availableGigs.slice(0, 6).map((gig) => {
                      const hasBid = myBids.some((b) => (b.booking?._id || b.booking) === gig._id);
                      return (
                        <div
                          key={gig._id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4.5 transition hover:bg-slate-50/60 rounded-xl px-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-extrabold text-green-700">
                                {gig.service?.title || 'Service Request'}
                              </span>
                              {hasBid && (
                                <span className="rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-700">
                                  Bid Submitted
                                </span>
                              )}
                            </div>
                            <p className="mt-1.5 font-bold text-sm text-slate-900 truncate">
                              {gig.title || 'Work request'}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <MapPin size={12} className="text-slate-400" />
                                {gig.location?.address || 'Dhaka'}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <CalendarDays size={12} className="text-slate-400" />
                                {gig.schedule?.date || 'Today'}
                              </span>
                              <span>•</span>
                              <span className="font-extrabold text-green-700">
                                Min bid: ৳{gig.minLimit || 'Flexible'}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 self-end sm:self-center">
                            <Link
                              to={`/dashboard/technician/gigs`}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 transition hover:border-green-500 hover:bg-green-50 hover:text-green-700 shadow-2xs"
                            >
                              <span>{hasBid ? 'Review Bid' : 'Place Bid'}</span>
                              <ArrowUpRight size={14} />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                /* Tab 2: My Placed Bids */
                myBids.length === 0 ? (
                  <div className="py-14 text-center">
                    <Send size={32} className="mx-auto text-slate-300" />
                    <h3 className="mt-3 text-base font-black text-slate-800">No bids submitted yet</h3>
                    <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
                      Explore nearby customer requests and place competitive bids to win jobs.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('opportunities')}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-green-700"
                    >
                      <BriefcaseBusiness size={14} />
                      <span>Browse Opportunities</span>
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {myBids.map((bid) => {
                      const gigId = bid.booking?._id || bid.booking;
                      const isSelected = isAcceptedBid(bid);
                      return (
                        <div
                          key={bid._id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 rounded-xl px-2 transition hover:bg-slate-50/60"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase ${
                                isSelected
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {isSelected ? 'Selected' : (bid.status || 'Pending')}
                              </span>
                              <span className="font-extrabold text-slate-900 text-xs">
                                Bid: ৳{bid.price}
                              </span>
                            </div>
                            <p className="mt-1.5 font-bold text-sm text-slate-900 truncate">
                              {bid.booking?.title || bid.booking?.service?.title || 'Customer Request'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Estimated Arrival: {bid.estimatedArrival || '30 mins'}
                            </p>
                          </div>

                          <div className="shrink-0 self-end sm:self-center">
                            <Link
                              to={`/dashboard/technician/gigs/${gigId}`}
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                                isSelected
                                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-xs'
                                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <MessageCircle size={14} />
                                  <span>Chat Open</span>
                                </>
                              ) : (
                                <>
                                  <span>Details</span>
                                  <ArrowUpRight size={14} />
                                </>
                              )}
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

            </div>
          </div>

          {/* Right Column: Pro Quick Actions & Tips */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Pro Profile Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-600 text-white shadow-xs">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{user?.name || 'Technician'}</h3>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Customers prefer technicians with complete profiles, clear photos, and quick response times.
              </p>
              <Link
                to="/dashboard/technician/profile"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                <Wrench size={14} />
                <span>Edit Services & Bio</span>
              </Link>
            </div>

            {/* Platform Guarantee Reminder */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-green-950 p-6 text-white shadow-xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20 text-green-400 border border-green-500/30">
                <BadgeCheck size={20} />
              </div>
              <h3 className="mt-4 text-base font-black">Direct Customer Payment</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                Once selected by a customer, your direct P2P chat opens automatically so you can align on time, parts, and payment.
              </p>
              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" /> 0% commission on labor</span>
                <span className="text-green-400">Verified</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
