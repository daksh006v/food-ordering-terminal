import {
  assertNever,
  CardPayment,
  CashPayment,
  Payment,
  UpiPayment,
} from "./types.js";

export interface PaymentProcessingResult {
  success: boolean;
  message: string;
  change?: number;
}

// Factory functions for payments
export function createCashPayment(receivedAmount: number): CashPayment {
  return {
    method: "cash",
    receivedAmount,
  };
}

export function createCardPayment(last4Digits: string): CardPayment {
  return {
    method: "card",
    last4Digits,
  };
}

export function createUpiPayment(transactionId: string): UpiPayment {
  return {
    method: "upi",
    transactionId,
  };
}

// Process payment using type narrowing with the 'in' operator and exhaustiveness checking
export function processPayment(
  payment: Payment,
  payableAmount: number
): PaymentProcessingResult {
  if ("receivedAmount" in payment) {
    // Type narrowed to CashPayment
    if (payment.receivedAmount < payableAmount) {
      const shortage = (payableAmount - payment.receivedAmount).toFixed(2);
      return {
        success: false,
        message: `Insufficient cash provided. Short by ₹${shortage}.`,
      };
    }
    const change = Number((payment.receivedAmount - payableAmount).toFixed(2));
    return {
      success: true,
      message: `Cash payment accepted. Received ₹${payment.receivedAmount.toFixed(2)}.`,
      change,
    };
  }

  if ("last4Digits" in payment) {
    // Type narrowed to CardPayment
    if (!/^\d{4}$/.test(payment.last4Digits)) {
      return {
        success: false,
        message: "Invalid card details: must provide exactly the last 4 digits.",
      };
    }
    return {
      success: true,
      message: `Card payment approved for card ending in ****${payment.last4Digits}.`,
    };
  }

  if ("transactionId" in payment) {
    // Type narrowed to UpiPayment
    if (!payment.transactionId.trim()) {
      return {
        success: false,
        message: "Invalid UPI transaction: Transaction ID cannot be empty.",
      };
    }
    return {
      success: true,
      message: `UPI payment verified with Ref/Txn ID: ${payment.transactionId.trim()}.`,
    };
  }

  // Exhaustive check
  return assertNever(payment);
}
