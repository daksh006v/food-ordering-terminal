// Core Types and Interfaces for Food Ordering & Billing System

export type FoodCategory = "pizza" | "burger" | "drink" | "dessert";

export interface FoodItem {
  id: number;
  name: string;
  category: FoodCategory;
  price: number;
  isAvailable: boolean;
}

export type MembershipLevel = "silver" | "gold" | "platinum";

export interface BaseCustomer {
  id: number;
  name: string;
  phone?: string;
  address: string;
}

export interface GuestCustomer extends BaseCustomer {
  type?: "guest";
}

export interface MemberCustomer extends BaseCustomer {
  type?: "member";
  membershipId: string;
  discountPercentage: number;
  membershipLevel: MembershipLevel;
}

export type Customer = GuestCustomer | MemberCustomer;

export interface OrderItemDetails {
  quantity: number;
  specialInstruction?: string;
}

// Intersection type for CartItem as required: FoodItem & OrderItemDetails
export type CartItem = FoodItem & OrderItemDetails;

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "delivered"
  | "cancelled";

export interface CashPayment {
  method: "cash";
  receivedAmount: number;
}

export interface CardPayment {
  method: "card";
  last4Digits: string;
}

export interface UpiPayment {
  method: "upi";
  transactionId: string;
}

export type Payment = CashPayment | CardPayment | UpiPayment;

export interface BillSuccess {
  status: "success";
  orderId: string;
  customer: Customer;
  items: CartItem[];
  subtotal: number;
  membershipDiscount: number;
  additionalDiscount: number;
  totalDiscount: number;
  amountAfterDiscount: number;
  tax: number;
  finalAmount: number;
  payment: Payment;
  orderStatus: OrderStatus;
  createdAt: Date;
}

export interface BillError {
  status: "error";
  message: string;
}

// Discriminated union for Bill Result
export type BillResult = BillSuccess | BillError;

// Exhaustiveness check helper using 'never'
export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}
