import { assertNever, FoodCategory, FoodItem, OrderStatus } from "./types.js";

// Valid order statuses list
export const ORDER_STATUSES: readonly OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "delivered",
  "cancelled",
] as const;

// Type guard to check if a string is a valid OrderStatus
export function isValidOrderStatus(status: string): status is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(status);
}

// Update and return the new order status
export function updateOrderStatus(
  _currentStatus: OrderStatus,
  newStatus: OrderStatus
): OrderStatus {
  return newStatus;
}

// Get user-friendly description for an order status with exhaustive checking
export function getOrderStatusDescription(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "Order has been placed and is awaiting confirmation.";
    case "confirmed":
      return "Order confirmed and queued for preparation.";
    case "preparing":
      return "Chef is preparing your delicious meal in the kitchen.";
    case "delivered":
      return "Order successfully delivered! Enjoy your meal.";
    case "cancelled":
      return "Order has been cancelled.";
    default:
      return assertNever(status);
  }
}

// Bonus Feature: Filter food items by category
export function filterFoodByCategory(
  items: FoodItem[],
  category: FoodCategory
): FoodItem[] {
  return items.filter((item) => item.category === category);
}

// Bonus Feature: Search food items by name
export function searchFoodByName(
  items: FoodItem[],
  query: string
): FoodItem[] {
  const normalized = query.trim().toLowerCase();
  return items.filter((item) => item.name.toLowerCase().includes(normalized));
}
