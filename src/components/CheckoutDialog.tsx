import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  /** subscription/catalog price id */
  priceId?: string;
  /** platform invoice id (one-time) */
  platformInvoiceId?: string;
  quantity?: number;
  customerEmail?: string;
  userId?: string;
  returnUrl: string;
}

export function CheckoutDialog({ open, onOpenChange, title, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {open && <StripeEmbeddedCheckout {...rest} />}
      </DialogContent>
    </Dialog>
  );
}
