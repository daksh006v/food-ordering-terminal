import { CartItem, FoodItem } from "./types.js";

// Calculate the total price for a single cart item (price * quantity)
export function calculateItemTotal(item: CartItem): number {
  return item.price * item.quantity;
}

// Calculate the subtotal for all items in the cart using Array.reduce
export function calculateSubtotal(cart: CartItem[]): number {
  return cart.reduce((total, item) => total + calculateItemTotal(item), 0);
}

// Add an item to the cart or increase quantity if it already exists
export function addToCart(
  cart: CartItem[],
  foodItem: FoodItem,
  quantity: number,
  specialInstruction?: string
): CartItem[] {
  if (quantity <= 0 || !foodItem.isAvailable) {
    return cart;
  }

  const existingItemIndex = cart.findIndex((item) => item.id === foodItem.id);

  if (existingItemIndex !== -1) {
    return cart.map((item, index) => {
      if (index === existingItemIndex) {
        return {
          ...item,
          quantity: item.quantity + quantity,
          specialInstruction: specialInstruction ?? item.specialInstruction,
        };
      }
      return item;
    });
  }

  const newCartItem: CartItem = {
    ...foodItem,
    quantity,
    ...(specialInstruction && { specialInstruction }),
  };

  return [...cart, newCartItem];
}

// Update the quantity of an item in the cart. Removes item if newQuantity <= 0.
export function updateQuantity(
  cart: CartItem[],
  itemId: number,
  newQuantity: number
): CartItem[] {
  if (newQuantity <= 0) {
    return removeFromCart(cart, itemId);
  }

  return cart.map((item) => {
    if (item.id === itemId) {
      return {
        ...item,
        quantity: newQuantity,
      };
    }
    return item;
  });
}

// Remove an item from the cart by its ID
export function removeFromCart(cart: CartItem[], itemId: number): CartItem[] {
  return cart.filter((item) => item.id !== itemId);
}
