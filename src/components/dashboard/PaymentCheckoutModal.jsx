import { useEffect, useRef, useState } from 'react';
import { Banknote, Check, Copy, CreditCard, ShieldCheck, Tag, X } from 'lucide-react';
import { fetchCoupons, fetchPaymentMethods } from '../../services/api';
import SwalMessage from '../ui/SwalMessage';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';
const resolveImage = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

// Coupon rules copied from the mobile app (CouponModel.isValid / discountFor)
const isCouponValid = (coupon) => {
  const total = Number(coupon.total || 0);
  if (total > 0 && Number(coupon.used || 0) >= total) return false;
  const now = Date.now();
  if (coupon.startdate && now < new Date(coupon.startdate).getTime()) return false;
  if (coupon.enddate && now > new Date(coupon.enddate).getTime()) return false;
  return true;
};
const couponDiscount = (coupon, base) => {
  const raw = coupon.type === 'percentage'
    ? Math.round((base * Number(coupon.parcentage || 0)) / 100)
    : Math.round(Number(coupon.ammount || 0));
  return Math.min(Math.max(raw, 0), base);
};
const couponLabel = (coupon) => (coupon.type === 'percentage' ? `${coupon.parcentage}% off` : `৳${coupon.ammount} off`);

// Used when the admin hasn't configured any payment methods
const FALLBACK_METHODS = [{ _id: 'bkash', name: 'bKash' }, { _id: 'nagad', name: 'Nagad' }];

/**
 * Checkout for amounts due after a technician is selected.
 * `lines` is the price breakdown ([{ label, amount }]); `allowCash` adds a pay-on-site option.
 * `allowCoupons` shows the coupon picker. Like the mobile app, the discount is only shown
 * here; the coupon isn't sent with the payment.
 * onConfirm receives { paymentMethod, transactionId } where paymentMethod is the method name
 * (or 'cash'), matching what the mobile app sends.
 */
export default function PaymentCheckoutModal({ isOpen, onClose, title, subtitle, lines = [], allowCash = false, allowCoupons = false, submitting, onConfirm }) {
  const [methods, setMethods] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [payInCash, setPayInCash] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');
  const [coupons, setCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const dialogRef = useRef(null);
  const closeRef = useRef({ onClose, submitting });
  useEffect(() => {
    closeRef.current = { onClose, submitting };
  });

  useEffect(() => {
    if (!isOpen) return undefined;
    let active = true;
    fetchPaymentMethods().then((list) => {
      if (active) setMethods(list.length ? list : FALLBACK_METHODS);
    });
    if (allowCoupons) {
      fetchCoupons().then((list) => {
        if (active) setCoupons(list.filter(isCouponValid));
      });
    }
    return () => { active = false; };
  }, [isOpen, allowCoupons]);

  // Focus the dialog on open, close on Escape, restore focus on close
  useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    dialogRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !closeRef.current.submitting) closeRef.current.onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const subtotal = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const discount = appliedCoupon ? couponDiscount(appliedCoupon, subtotal) : 0;
  const total = subtotal - discount;

  const applyCoupon = (code) => {
    const wanted = code.trim().toUpperCase();
    const match = coupons.find((coupon) => coupon.code?.toUpperCase() === wanted);
    if (!match || !isCouponValid(match)) {
      setAppliedCoupon(null);
      setCouponError('Invalid or expired coupon code.');
      return;
    }
    setCouponCode(match.code);
    setAppliedCoupon(match);
    setCouponError('');
  };
  const selected = methods?.find((method) => method._id === selectedId) || methods?.[0];
  const cash = allowCash && payInCash;

  const copyAccount = async (account) => {
    try {
      await navigator.clipboard.writeText(account);
      setCopied(account);
      window.setTimeout(() => setCopied(''), 1500);
    } catch {
      // Clipboard can be blocked; the number is still visible to copy by hand
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (cash) {
      onConfirm({ paymentMethod: 'cash', transactionId: '' });
      return;
    }
    if (!selected) return;
    if (!transactionId.trim()) {
      setError('Enter the transaction ID from your payment.');
      return;
    }
    setError('');
    onConfirm({ paymentMethod: selected.name, transactionId: transactionId.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        tabIndex={-1}
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl outline-none sm:p-8"
      >
        <button
          onClick={onClose}
          type="button"
          disabled={submitting}
          aria-label="Close payment dialog"
          className="absolute right-5 top-5 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-600">
            <ShieldCheck size={26} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-green-600">{subtitle || 'Payment'}</p>
            <h2 id="checkout-title" className="text-xl font-black text-slate-900">{title}</h2>
          </div>
        </div>

        <dl className="mt-5 space-y-2 rounded-2xl border border-green-100 bg-green-50/70 p-4 text-sm">
          {lines.map((line) => (
            <div key={line.label} className="flex justify-between text-slate-600">
              <dt>{line.label}</dt>
              <dd className="font-semibold">৳{Number(line.amount || 0).toLocaleString()}</dd>
            </div>
          ))}
          {discount > 0 && (
            <div className="flex justify-between text-green-700">
              <dt>Coupon {appliedCoupon.code}</dt>
              <dd className="font-semibold">−৳{discount.toLocaleString()}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-green-200 pt-2">
            <dt className="font-bold text-slate-800">Total</dt>
            <dd className="text-2xl font-black text-green-700">৳{total.toLocaleString()}</dd>
          </div>
        </dl>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {allowCoupons && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Tag size={14} /> Coupon</p>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-xl border border-green-300 bg-green-50 px-3.5 py-2.5 text-sm font-semibold text-green-800">
                  <span>{appliedCoupon.code} — coupon applied</span>
                  <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} aria-label="Remove coupon" className="rounded-full p-1 text-rose-500 hover:bg-rose-50">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  {coupons.length > 0 && (
                    <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                      {coupons.map((coupon) => (
                        <button
                          key={coupon._id}
                          type="button"
                          onClick={() => applyCoupon(coupon.code)}
                          className="shrink-0 rounded-xl border border-dashed border-green-400 bg-green-50/60 px-3 py-2 text-left transition hover:border-green-600"
                        >
                          <span className="block font-mono text-sm font-black text-green-800">{coupon.code}</span>
                          <span className="block text-xs text-green-700">{couponLabel(coupon)} · save ৳{couponDiscount(coupon, subtotal).toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm uppercase outline-none focus:border-green-500"
                    />
                    <button type="button" onClick={() => applyCoupon(couponCode)} disabled={!couponCode.trim()} className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">
                      Apply
                    </button>
                  </div>
                  <SwalMessage message={couponError} />
                </>
              )}
            </div>
          )}

          {allowCash && (
            <label className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3.5 transition ${cash ? 'border-green-500 bg-green-50/40' : 'border-slate-200 hover:border-slate-300'}`}>
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Banknote size={18} /></span>
                <span>
                  <span className="block text-sm font-bold text-slate-800">Pay cash after service</span>
                  <span className="block text-xs text-slate-500">Hand the amount to the technician; they confirm receipt</span>
                </span>
              </span>
              <input type="checkbox" checked={payInCash} onChange={(event) => setPayInCash(event.target.checked)} className="h-5 w-5 accent-green-600" />
            </label>
          )}

          {!cash && (
            <>
              <fieldset>
                <legend className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Select payment method</legend>
                {!methods ? (
                  <p className="text-sm text-slate-500">Loading payment methods...</p>
                ) : (
                  <div className="space-y-2">
                    {methods.map((method) => {
                      const checked = selected?._id === method._id;
                      return (
                        <label key={method._id} className={`block cursor-pointer rounded-2xl border p-3.5 transition ${checked ? 'border-green-500 bg-green-50/40 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                          <span className="flex items-center gap-3">
                            <input type="radio" name="payment-method" checked={checked} onChange={() => setSelectedId(method._id)} className="accent-green-600" />
                            {method.image ? (
                              <img src={resolveImage(method.image)} alt="" className="h-9 w-9 rounded-xl object-cover" />
                            ) : (
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-600"><CreditCard size={18} /></span>
                            )}
                            <span className="min-w-0">
                              <span className="block text-sm font-bold text-slate-800">{method.name}</span>
                              {method.description && <span className="block text-xs text-slate-500">{method.description}</span>}
                            </span>
                          </span>
                          {checked && method.account && (
                            <span className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
                              <span>Send to <strong className="font-mono text-sm text-slate-900">{method.account}</strong></span>
                              <button type="button" onClick={() => copyAccount(method.account)} className="inline-flex items-center gap-1 font-bold text-green-700 hover:text-green-800">
                                {copied === method.account ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                              </button>
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>

              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Transaction ID
                <input
                  type="text"
                  required
                  placeholder="e.g. 9X2A881B"
                  value={transactionId}
                  onChange={(event) => setTransactionId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium normal-case tracking-normal text-slate-900 outline-none focus:border-green-500"
                />
              </label>
            </>
          )}

          <SwalMessage message={error} />

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="w-1/2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting || (!cash && !methods)} className="w-1/2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-green-200 hover:bg-green-700 disabled:opacity-60">
              {submitting ? 'Processing...' : cash ? 'Confirm cash payment' : `Pay ৳${total.toLocaleString()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
