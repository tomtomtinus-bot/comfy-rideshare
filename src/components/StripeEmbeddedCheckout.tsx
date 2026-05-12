import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
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

export function StripeEmbeddedCheckout(props: Props) {
  const fetchClientSecret = async (): Promise<string> => {
    const env = getStripeEnvironment();
    if (props.platformInvoiceId) {
      const { data, error } = await supabase.functions.invoke("create-platform-invoice-checkout", {
        body: {
          invoiceId: props.platformInvoiceId,
          returnUrl: props.returnUrl,
          environment: env,
        },
      });
      if (error || !data?.clientSecret) throw new Error(error?.message || "Checkout fout");
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
    if (error || !data?.clientSecret) throw new Error(error?.message || "Checkout fout");
    return data.clientSecret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
