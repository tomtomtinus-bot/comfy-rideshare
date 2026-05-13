import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Component, useCallback, useMemo, useState, type ReactNode } from "react";
import { getStripe, getStripeEnvironment, hasStripeClientToken } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  /** Recurring or fixed-price catalog item. */
  priceId?: string;
  /** Pay an existing platform_invoices row. Mutually exclusive with priceId. */
  platformInvoiceId?: string;
  quantity?: number;
  customerEmail?: string;
  userId?: string;
  returnUrl: string;
}

class CheckoutErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Stripe embedded checkout render error:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Het betaalformulier kon niet worden geladen. Sluit dit venster en probeer het opnieuw.
        </div>
      );
    }

    return this.props.children;
  }
}

export function StripeEmbeddedCheckout(props: Props) {
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const stripe = useMemo(() => getStripe(), []);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    setCheckoutError(null);
    try {
      const env = getStripeEnvironment();
      if (props.platformInvoiceId) {
        const { data, error } = await supabase.functions.invoke("create-platform-invoice-checkout", {
          body: {
            invoiceId: props.platformInvoiceId,
            returnUrl: props.returnUrl,
            environment: env,
          },
        });
        if (error || !data?.clientSecret) throw new Error(data?.error || error?.message || "Checkout fout");
        return data.clientSecret;
      }
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId: props.priceId,
          quantity: props.quantity,
          customerEmail: props.customerEmail,
          userId: props.userId,
          returnUrl: props.returnUrl,
          environment: env,
        },
      });
      if (error || !data?.clientSecret) throw new Error(data?.error || error?.message || "Checkout fout");
      return data.clientSecret;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Checkout fout";
      setCheckoutError(message);
      throw error;
    }
  }, [props.customerEmail, props.platformInvoiceId, props.priceId, props.quantity, props.returnUrl, props.userId]);

  const checkoutOptions = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  if (!hasStripeClientToken()) {
    return (
      <div className="border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        Betalen is tijdelijk niet beschikbaar. Probeer het later opnieuw of neem contact op met support@viacust.com.
      </div>
    );
  }

  if (checkoutError) {
    return (
      <div className="border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        Checkout fout: {checkoutError}
      </div>
    );
  }

  return (
    <div id="checkout" className="min-h-[560px]">
      <CheckoutErrorBoundary>
        <EmbeddedCheckoutProvider stripe={stripe} options={checkoutOptions}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </CheckoutErrorBoundary>
    </div>
  );
}
