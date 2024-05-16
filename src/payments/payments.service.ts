import { Injectable } from '@nestjs/common';
import { envs } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.stripeSecret);

  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { currency, items } = paymentSessionDto;
    const limeItems = items.map(item => {
      return {
        price_data: {
          currency,
          product_data: {
            name: item.name
          },
          unit_amount: Math.round(item.price * 100), // 20 dólares = 2000/100 = 20.00
        },
        quantity: item.quantity
      }
    })
    const session = await this.stripe.checkout.sessions.create({
      // Colocar aquí el Id de mi orden
      payment_intent_data: {
        metadata: {}
      },
      line_items: limeItems,
      mode: 'payment',
      success_url: envs.stripeSuccessUrl,
      cancel_url: envs.stripeCancelUrl,
    })
    return session;
  }

  async stripeWebhook(req: Request, res: Response) {
    // TESTING This is your Stripe CLI webhook secret for testing your endpoint locally.
    //const endpointSecret = "whsec_43c7339059e8d96a44d723a80d8580ac08273b12dc2ede670817899f2be8fe91";
    
    // REAL This is your Stripe CLI webhook secret for testing your endpoint locally.
    const endpointSecret = envs.stripeEndpointSecret;
    const sig = req.headers['stripe-signature'];
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(req['rawBody'], sig, endpointSecret);
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
    switch(event.type) {
      case 'charge.succeeded':
        const chargeSucceded = event.data.object;
        // TODO: Llamar al microservicio
        console.log({
          metadata: chargeSucceded.metadata,
          orderId: chargeSucceded.metadata.orderId,
        })
      break;

      default:
        console.log(`Event ${event.type } not handled`);
    }
    return res.status(200).json({sig})
  }
}
