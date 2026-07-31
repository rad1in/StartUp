import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useLanguage } from '../../context/LanguageContext';

// Where any redirect-style gateway (AqayePardakht, ZarinPal, Zibal — Saman
// and PayPing POST straight to a backend route instead) sends the customer's
// browser back to after they finish paying on the bank's own page. Each
// gateway names its query params differently, so we detect which one is
// present and pull out its providerRef before re-verifying against our own
// backend, which is the single source of truth for whether the order
// actually got paid.
export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [state, setState] = useState('checking'); // checking | success | failed
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let providerRef = null;
    let obviouslyFailed = false;

    if (searchParams.get('transid')) {
      // AqayePardakht
      providerRef = searchParams.get('transid');
    } else if (searchParams.get('Authority')) {
      // ZarinPal
      providerRef = searchParams.get('Authority');
      obviouslyFailed = searchParams.get('Status') !== 'OK';
    } else if (searchParams.get('trackId')) {
      // Zibal
      providerRef = searchParams.get('trackId');
      obviouslyFailed = searchParams.get('success') === '0' || searchParams.get('status') === '2';
    }

    if (!providerRef || obviouslyFailed) {
      setState('failed');
      return;
    }

    // This one callback page is the redirect target for order checkout,
    // wallet top-up, and SMS-credit top-up alike (every real gateway's
    // callbackUrl points here) — but each of those lives in a different
    // table with its own verify endpoint. providerRef is a single opaque
    // token from the gateway with no purpose marker, so try them in turn
    // and stop at whichever one actually finds the pending transaction.
    api
      .get(`/payments/verify/${providerRef}`)
      .then(({ data }) => {
        setOrder(data.order);
        setState(data.order?.paymentStatus === 'SUCCESS' ? 'success' : 'failed');
      })
      .catch(() =>
        api
          .get(`/wallet/topup/verify/${providerRef}`)
          .then(() => setState('success'))
          .catch(() =>
            api
              .get(`/sms-credit/verify/${providerRef}`)
              .then(() => setState('success'))
              .catch(() => setState('failed'))
          )
      );
  }, [searchParams]);

  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      <Card className="text-center py-10">
        {state === 'checking' && <p className="text-gray-500">{t('paymentCallback.checking')}</p>}

        {state === 'success' && (
          <>
            <CheckCircle size={48} className="mx-auto text-green-600 mb-4" />
            <h2 className="font-bold text-ink text-lg mb-2">{t('menu.paymentSuccess')}</h2>
            <p className="text-sm text-gray-500 mb-6">
              {order ? t('paymentCallback.orderSent') : t('paymentCallback.walletUpdated')}
            </p>
            <Button onClick={() => navigate(order ? `/account/orders/${order.id}` : '/')}>
              {order ? t('paymentCallback.viewOrder') : t('menu.backToHome')}
            </Button>
          </>
        )}

        {state === 'failed' && (
          <>
            <XCircle size={48} className="mx-auto text-red-600 mb-4" />
            <h2 className="font-bold text-ink text-lg mb-2">{t('paymentCallback.failedTitle')}</h2>
            <p className="text-sm text-gray-500 mb-6">{t('paymentCallback.failedDesc')}</p>
            <Button variant="secondary" onClick={() => navigate('/')}>
              {t('menu.backToHome')}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
