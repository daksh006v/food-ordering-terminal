import {
  BillResult,
  BillSuccess,
  CartItem,
  Customer,
  OrderStatus,
  Payment,
} from "./types.js";
import { calculateSubtotal } from "./cart.js";
import { getCustomerDiscountPercentage } from "./customer.js";

export interface DiscountBreakdown {
  membershipDiscount: number;
  additionalDiscount: number;
  totalDiscount: number;
}

// Calculate membership and threshold-based discounts
export function calculateDiscount(
  subtotal: number,
  customer: Customer
): DiscountBreakdown {
  const memberDiscountPercent = getCustomerDiscountPercentage(customer);
  const membershipDiscount = Number(
    ((subtotal * memberDiscountPercent) / 100).toFixed(2)
  );

  // Additional 5% discount if subtotal > 2000
  const additionalDiscountPercent = subtotal > 2000 ? 5 : 0;
  const additionalDiscount = Number(
    ((subtotal * additionalDiscountPercent) / 100).toFixed(2)
  );

  const totalDiscount = Number(
    (membershipDiscount + additionalDiscount).toFixed(2)
  );

  return {
    membershipDiscount,
    additionalDiscount,
    totalDiscount,
  };
}

// Calculate 5% GST on the amount after discount
export function calculateTax(amountAfterDiscount: number): number {
  const GST_RATE = 0.05;
  return Number((amountAfterDiscount * GST_RATE).toFixed(2));
}

// Calculate the final payable amount after discount and tax
export function calculateFinalAmount(
  subtotal: number,
  totalDiscount: number,
  tax: number
): number {
  const amountAfterDiscount = Math.max(0, subtotal - totalDiscount);
  return Number((amountAfterDiscount + tax).toFixed(2));
}

// Generate the final bill returning a discriminated union (BillResult)
export function generateBill(
  orderId: string,
  customer: Customer,
  cart: CartItem[],
  payment: Payment,
  orderStatus: OrderStatus
): BillResult {
  if (cart.length === 0) {
    return {
      status: "error",
      message: "Cart is empty. Cannot generate a bill.",
    };
  }

  const subtotal = calculateSubtotal(cart);
  const { membershipDiscount, additionalDiscount, totalDiscount } =
    calculateDiscount(subtotal, customer);

  const amountAfterDiscount = Math.max(0, subtotal - totalDiscount);
  const tax = calculateTax(amountAfterDiscount);
  const finalAmount = calculateFinalAmount(subtotal, totalDiscount, tax);

  const successBill: BillSuccess = {
    status: "success",
    orderId,
    customer,
    items: [...cart],
    subtotal,
    membershipDiscount,
    additionalDiscount,
    totalDiscount,
    amountAfterDiscount,
    tax,
    finalAmount,
    payment,
    orderStatus,
    createdAt: new Date(),
  };

  return successBill;
}
