import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const plan = subscription.items.data[0]?.price.nickname ?? "pro";

        // Find user by customer ID
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId);

        if (profiles && profiles.length > 0) {
          const userId = profiles[0].id;
          const tier = plan.includes("business")
            ? "business"
            : plan.includes("pro")
            ? "pro"
            : "free";

          // Update profile
          await supabase
            .from("profiles")
            .update({ subscription_tier: tier })
            .eq("id", userId);

          // Upsert subscription record
          await supabase.from("subscriptions").upsert({
            user_id: userId,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: customerId,
            plan: tier,
            status: subscription.status,
            current_period_end: new Date(
              (subscription as any).current_period_end * 1000
            ).toISOString(),
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId);

        if (profiles && profiles.length > 0) {
          const userId = profiles[0].id;

          await supabase
            .from("profiles")
            .update({ subscription_tier: "free" })
            .eq("id", userId);

          await supabase
            .from("subscriptions")
            .update({ status: "canceled" })
            .eq("stripe_subscription_id", subscription.id);
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Handle any post-checkout logic
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed. Please check server logs." },
      { status: 500 }
    );
  }
}
