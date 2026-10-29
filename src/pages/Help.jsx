import { PageHeading } from "../components/UI";
export default function Help() {
  return (
    <div className="container page help-page">
      <PageHeading
        title="A little help, whenever you need it."
        description="Shopping, delivery and payment information."
      />
      {[
        [
          "Where do you deliver?",
          "The current service configuration supports six-digit PIN codes beginning 110, 140, 141 and 160. Delivery is managed by the store; the application does not book couriers.",
        ],
        [
          "What does delivery cost?",
          "Delivery is ₹35 for baskets below ₹499 and free from ₹499, calculated before coupon discounts. All displayed prices include tax.",
        ],
        [
          "How does FRESH10 work?",
          "Apply FRESH10 in your cart for 10% off a subtotal of ₹499 or more, up to ₹100. If the basket falls below ₹499, the coupon no longer reduces the total.",
        ],
        [
          "What is the freshness promise?",
          "Check product pack information and contact the store about freshness concerns. Reviews in the original fresh-produce catalog are sample data. Branded prices are dated retailer references, not a live price feed.",
        ],
        [
          "Where are my details saved?",
          "Your account and orders are saved on the store server. Cart and wishlist are saved in this browser. Passwords are hashed; card and UPI credentials are handled by Razorpay, not Green Cart.",
        ],
        [
          "How do online payments work?",
          "This release supports Razorpay Test Mode only. Online checkout becomes available when the store owner configures test keys. Payment is marked verified only after the server validates the signature, captured status and exact amount. No real money is charged.",
        ],
      ].map(([q, a], i) => (
        <details key={q} id={i === 3 ? "returns" : undefined} open={i === 0}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  );
}
