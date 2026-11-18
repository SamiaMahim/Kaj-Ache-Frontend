import { useState, useEffect, useRef } from 'react';
import { Check, Copy, CreditCard, ShieldCheck, Wallet, X } from 'lucide-react';
import { fetchPaymentMethods, getCurrentAccount } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const API_ORIGIN = import.meta.env.VITE_API_URL || '';
const resolveImage = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ORIGIN}/${value.replace(/^\//, '')}`;
};

// The fee must be paid before bidding, so cash doesn't apply; the wallet is the built-in option below
const isFeeMethod = (method) => !/^(cash|.*wallet.*)$/i.test(method.name?.trim() || '');

// Used when the admin hasn't configured any payment methods
const FALLBACK_METHODS = [{ _id: 'bkash', name: 'bKash' }, { _id: 'nagad', name: 'Nagad' }];

const WALLET = 'wallet';

export default function SystemFeePaymentModal({ isOpen, onClose, gig, fee, onConfirm, submitting }) {
  const { walletBalance: cachedBalance } = useAuth();
  // null = user hasn't picked a method yet; the default is derived from the balance below
  const [selectedId, setSelectedId] = useState(null);
  // Fresh balance from the server; until it arrives the cached balance from AuthContext is used
  const [fetchedBalance, setFetchedBalance] = useState(null);
  const [accountStatus, setAccountStatus] = useState('loading'); // 'loading' | 'ready' | 'failed'
  // Admin-managed payment methods (GET /paymentMethod, active only)
  const [methods, setMethods] = useState(null);
  const [transactionId, setTransactionId] = useState('');
  const [txnError, setTxnError] = useState('');
  const [copied, setCopied] = useState('');
  const dialogRef = useRef(null);
  // Latest close handler/submitting flag for the keydown listener, so the focus effect
  // only runs on open/close (callers pass inline onClose functions)
  const closeRef = useRef({ onClose, submitting });
  useEffect(() => {
    closeRef.current = { onClose, submitting };
  });

  const finalFee = Number(fee || gig?.systemFee || 50);
  const walletBalance = fetchedBalance ?? Number(cachedBalance || 0);
  const loadingAccount = accountStatus === 'loading' && fetchedBalance === null;
  const hasSufficientWallet = walletBalance >= finalFee;
  const firstMethodId = methods?.[0]?._id;
  // Never leave the selection on a disabled wallet radio
  const selected = selectedId === WALLET && !hasSufficientWallet
    ? firstMethodId
    : selectedId || (hasSufficientWallet ? WALLET : firstMethodId);
  const selectedMethod = methods?.find((method) => method._id === selected);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    getCurrentAccount()
      .then((account) => {
        if (!active) return;
        if (account?.profileDetail) {
          setFetchedBalance(Number(account.profileDetail.walletBalance || 0));
          setAccountStatus('ready');
        } else {
          setAccountStatus('failed');
        }
      })
      .catch((err) => {
        console.warn('Could not load account details', err);
        if (active) setAccountStatus('failed');
      });
    fetchPaymentMethods().then((list) => {
      if (!active) return;
      const usable = list.filter(isFeeMethod);
      setMethods(usable.length ? usable : FALLBACK_METHODS);
    });

    return () => {
      active = false;
    };
  }, [isOpen]);

  // Focus the dialog on open, close on Escape, restore focus on close
  useEffect(() => {
    if (!isOpen) return;
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

  const copyAccount = async (account) => {
    try {
      await navigator.clipboard.writeText(account);
      setCopied(account);
      window.setTimeout(() => setCopied(''), 1500);
    } catch {
      // Clipboard can be blocked; the number is still visible to copy by hand
    }
  };

  // Same as the mobile app: the wallet is debited by the server, other methods need the real transaction ID.
  // The method name is sent, matching the post-selection checkout.
  const handlePay = (e) => {
    e.preventDefault();
    if (selected === WALLET) {
      onConfirm({ paymentMethod: WALLET, transactionId: '' });
      return;
    }
    if (!selectedMethod) return;
    if (!transactionId.trim()) {
      setTxnError(`Enter the transaction ID from your ${selectedMethod.name} payment.`);
      return;
    }
    setTxnError('');
    onConfirm({ paymentMethod: selectedMethod.name, transactionId: transactionId.trim() });
  };

  const optionClass = (checked) => `block cursor-pointer rounded-2xl border p-3.5 transition ${
    checked ? 'border-green-500 bg-green-50/40 shadow-sm' : 'border-slate-200 hover:border-slate-300'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-fee-title"
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
            <p className="text-xs font-bold uppercase tracking-wider text-green-600">Mandatory System Charge</p>
            <h2 id="system-fee-title" className="text-xl font-black text-slate-900">Place Service Request Online</h2>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-green-50/70 p-4 border border-green-100">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-slate-600">Bid Placement Charge:</span>
            <span className="text-2xl font-black text-green-700">৳{finalFee}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-green-800">
            <strong>Refund Guarantee:</strong> If this service request fails or you cancel before technician bidding, the ৳{finalFee} will be automatically refunded to your account wallet.
          </p>
        </div>

        <form onSubmit={handlePay} className="mt-5 space-y-4">
          <fieldset>
            <legend className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Select Payment Method</legend>
            <div className="space-y-2">
              {/* Wallet: debited by the server, always offered */}
              <label className={`${optionClass(selected === WALLET)} ${!hasSufficientWallet ? 'opacity-65' : ''}`}>
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="method"
                      disabled={!hasSufficientWallet}
                      checked={selected === WALLET}
                      onChange={() => setSelectedId(WALLET)}
                      className="accent-green-600"
                    />
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <Wallet size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-slate-800">Account Wallet</span>
                      <span className="block text-xs text-slate-500">
                        {loadingAccount ? 'Checking balance...' : `Available balance: ৳${walletBalance}`}
                        {accountStatus === 'failed' && ' (could not refresh)'}
                      </span>
                    </span>
                  </span>
                  {loadingAccount && !hasSufficientWallet ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">Checking...</span>
                  ) : hasSufficientWallet ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">Instant</span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">Low balance</span>
                  )}
                </span>
              </label>

              {!methods ? (
                <p className="px-1 text-sm text-slate-500">Loading payment methods...</p>
              ) : methods.map((method) => {
                const checked = selected === method._id;
                return (
                  <label key={method._id} className={optionClass(checked)}>
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="method"
                        checked={checked}
                        onChange={() => setSelectedId(method._id)}
                        className="accent-green-600"
                      />
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
                        <span>Send ৳{finalFee} to <strong className="font-mono text-sm text-slate-900">{method.account}</strong></span>
                        <button type="button" onClick={() => copyAccount(method.account)} className="inline-flex items-center gap-1 font-bold text-green-700 hover:text-green-800">
                          {copied === method.account ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                        </button>
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {selected !== WALLET && selectedMethod && (
            <div>
              <label htmlFor="system-fee-txn" className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Transaction ID
              </label>
              <input
                id="system-fee-txn"
                type="text"
                required
                placeholder="e.g. 9X2A881B"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium outline-none focus:border-green-500"
              />
              {txnError && <p className="mt-1.5 text-xs font-semibold text-red-600">{txnError}</p>}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-1/2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (selected !== WALLET && !selectedMethod)}
              className="w-1/2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-green-200 hover:bg-green-700 disabled:opacity-60"
            >
              {submitting ? 'Processing...' : `Pay ৳${finalFee} & Place Online`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
