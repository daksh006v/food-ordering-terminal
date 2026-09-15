import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  BillSuccess,
  CartItem,
  Customer,
  FoodCategory,
  FoodItem,
  MembershipLevel,
  OrderStatus,
  Payment,
} from "./types.js";
import { initialFoodItems } from "./data.js";
import {
  createGuestCustomer,
  createMemberCustomer,
  isMember,
} from "./customer.js";
import {
  addToCart,
  calculateItemTotal,
  calculateSubtotal,
  removeFromCart,
  updateQuantity,
} from "./cart.js";
import { generateBill } from "./billing.js";
import {
  createCardPayment,
  createCashPayment,
  createUpiPayment,
  processPayment,
} from "./payment.js";
import {
  filterFoodByCategory,
  getOrderStatusDescription,
  isValidOrderStatus,
  ORDER_STATUSES,
  updateOrderStatus,
} from "./order.js";

// Application State
let currentCustomer: Customer | null = null;
let currentCart: CartItem[] = [];
let currentOrderStatus: OrderStatus = "pending";
let lastCompletedBill: BillSuccess | null = null;
let orderCounter = 101;

function displayHeader(title: string): void {
  console.log("\n========================================");
  console.log(`         ${title}`);
  console.log("========================================");
}

function displayFoodMenu(items: FoodItem[]): void {
  displayHeader("FOOD MENU");
  console.log(
    "ID  | Name                         | Category | Price  | Status"
  );
  console.log(
    "----+------------------------------+----------+--------+-----------"
  );
  for (const item of items) {
    const id = String(item.id).padEnd(3);
    const name = item.name.padEnd(28);
    const cat = item.category.padEnd(8);
    const price = `₹${item.price}`.padEnd(6);
    const status = item.isAvailable ? "Available" : "Sold Out";
    console.log(`${id} | ${name} | ${cat} | ${price} | ${status}`);
  }
}

function displayCart(cart: CartItem[]): void {
  displayHeader("YOUR CART");
  if (cart.length === 0) {
    console.log("Your cart is empty.");
    return;
  }

  console.log("ID  | Item Name                    | Qty | Price  | Total");
  console.log("----+------------------------------+-----+--------+--------");
  for (const item of cart) {
    const id = String(item.id).padEnd(3);
    const name = item.name.padEnd(28);
    const qty = String(item.quantity).padEnd(3);
    const price = `₹${item.price}`.padEnd(6);
    const total = `₹${calculateItemTotal(item)}`;
    console.log(`${id} | ${name} | ${qty} | ${price} | ${total}`);
    if (item.specialInstruction) {
      console.log(`     * Note: ${item.specialInstruction}`);
    }
  }
  console.log("---------------------------------------------------------");
  console.log(`Subtotal: ₹${calculateSubtotal(cart)}`);
}

function printBillSummary(bill: BillSuccess): void {
  displayHeader("ORDER SUMMARY");

  console.log(`Order ID:    ${bill.orderId}`);
  console.log(`Customer:    ${bill.customer.name}`);
  if (isMember(bill.customer)) {
    console.log(
      `Membership:  ${bill.customer.membershipLevel.toUpperCase()} (${bill.customer.discountPercentage}% off)`
    );
    console.log(`Member ID:   ${bill.customer.membershipId}`);
  } else {
    console.log("Membership:  Guest (No membership discount)");
  }
  console.log(`Delivery To: ${bill.customer.address}`);

  console.log("\nItems:");
  console.log("----------------------------------------");
  for (const item of bill.items) {
    const name = item.name.padEnd(22);
    const qty = `x${item.quantity}`.padEnd(7);
    const total = `₹${calculateItemTotal(item)}`;
    console.log(`${name} ${qty} ${total}`);
  }
  console.log("----------------------------------------");

  console.log(`Subtotal:                       ₹${bill.subtotal.toFixed(2)}`);
  console.log(
    `Membership Discount:            ₹${bill.membershipDiscount.toFixed(2)}`
  );
  console.log(
    `Additional Discount (>₹2000):   ₹${bill.additionalDiscount.toFixed(2)}`
  );
  console.log(
    `Total Discount:                 ₹${bill.totalDiscount.toFixed(2)}`
  );
  console.log(
    `Amount After Discount:          ₹${bill.amountAfterDiscount.toFixed(2)}`
  );
  console.log(`GST (5%):                       ₹${bill.tax.toFixed(2)}`);
  console.log("----------------------------------------");
  console.log(`Final Amount:                   ₹${bill.finalAmount.toFixed(2)}`);
  console.log("----------------------------------------");

  // Payment type narrowing with 'in'
  if ("receivedAmount" in bill.payment) {
    console.log("Payment Method: Cash");
    console.log(`Received Amount: ₹${bill.payment.receivedAmount.toFixed(2)}`);
    const change = bill.payment.receivedAmount - bill.finalAmount;
    if (change > 0) {
      console.log(`Change Returned: ₹${change.toFixed(2)}`);
    }
  } else if ("last4Digits" in bill.payment) {
    console.log("Payment Method: Card");
    console.log(`Card Number: **** **** **** ${bill.payment.last4Digits}`);
  } else if ("transactionId" in bill.payment) {
    console.log("Payment Method: UPI");
    console.log(`Transaction ID: ${bill.payment.transactionId}`);
  }

  console.log(`\nOrder Status: ${bill.orderStatus.toUpperCase()}`);
  console.log(`Note: ${getOrderStatusDescription(bill.orderStatus)}`);
  console.log("========================================");
  console.log("        Thank you for ordering!         ");
  console.log("========================================");
}

async function handleViewMenu(rl: readline.Interface): Promise<void> {
  console.log("\n1. View All Items");
  console.log("2. Filter by Category (pizza / burger / drink / dessert)");
  const choice = (await rl.question("Select option (1 or 2): ")).trim();

  if (choice === "2") {
    const catInput = (
      await rl.question("Enter category (pizza, burger, drink, dessert): ")
    )
      .trim()
      .toLowerCase();

    if (
      catInput === "pizza" ||
      catInput === "burger" ||
      catInput === "drink" ||
      catInput === "dessert"
    ) {
      const filtered = filterFoodByCategory(
        initialFoodItems,
        catInput as FoodCategory
      );
      displayFoodMenu(filtered);
    } else {
      console.log("Invalid category selected.");
    }
  } else {
    displayFoodMenu(initialFoodItems);
  }
}

async function handleCustomerSetup(rl: readline.Interface): Promise<void> {
  displayHeader("CUSTOMER SETUP");
  const name = (await rl.question("Enter customer name: ")).trim();
  if (!name) {
    console.log("Customer name cannot be empty.");
    return;
  }

  const address = (await rl.question("Enter delivery address: ")).trim();
  if (!address) {
    console.log("Address cannot be empty.");
    return;
  }

  const phone = (await rl.question("Enter phone number (optional): ")).trim();

  console.log("\nCustomer Type:");
  console.log("1. Guest (0% discount)");
  console.log("2. Member (Silver 5%, Gold 10%, Platinum 15%)");
  const typeChoice = (await rl.question("Choose (1 or 2): ")).trim();

  const id = Date.now();
  if (typeChoice === "2") {
    console.log("Membership Levels: silver / gold / platinum");
    const levelInput = (
      await rl.question("Enter membership level: ")
    )
      .trim()
      .toLowerCase();

    if (
      levelInput === "silver" ||
      levelInput === "gold" ||
      levelInput === "platinum"
    ) {
      currentCustomer = createMemberCustomer(
        id,
        name,
        address,
        levelInput as MembershipLevel,
        phone || undefined
      );
      console.log(
        `Member customer '${name}' created with ${levelInput.toUpperCase()} tier (${currentCustomer.discountPercentage}% discount)!`
      );
    } else {
      console.log("Invalid membership level. Defaulted to Guest customer.");
      currentCustomer = createGuestCustomer(
        id,
        name,
        address,
        phone || undefined
      );
    }
  } else {
    currentCustomer = createGuestCustomer(id, name, address, phone || undefined);
    console.log(`Guest customer '${name}' created successfully.`);
  }
}

async function handleAddToCart(rl: readline.Interface): Promise<void> {
  displayFoodMenu(initialFoodItems);
  const idInput = (await rl.question("\nEnter Food Item ID to add: ")).trim();
  const itemId = Number(idInput);

  const selectedItem = initialFoodItems.find((item) => item.id === itemId);
  if (!selectedItem) {
    console.log("Item with specified ID not found.");
    return;
  }

  if (!selectedItem.isAvailable) {
    console.log(`Sorry, ${selectedItem.name} is currently sold out.`);
    return;
  }

  const qtyInput = (await rl.question("Enter quantity: ")).trim();
  const quantity = parseInt(qtyInput, 10);
  if (isNaN(quantity) || quantity <= 0) {
    console.log("Please enter a valid positive number for quantity.");
    return;
  }

  const instruction = (
    await rl.question("Special instruction (optional, press Enter to skip): ")
  ).trim();

  currentCart = addToCart(
    currentCart,
    selectedItem,
    quantity,
    instruction || undefined
  );
  console.log(
    `Added ${quantity}x ${selectedItem.name} to cart. Subtotal: ₹${calculateSubtotal(currentCart)}`
  );
}

async function handleUpdateQuantity(rl: readline.Interface): Promise<void> {
  if (currentCart.length === 0) {
    console.log("Cart is empty.");
    return;
  }

  displayCart(currentCart);
  const idInput = (await rl.question("\nEnter Item ID to update: ")).trim();
  const itemId = Number(idInput);

  const existing = currentCart.find((i) => i.id === itemId);
  if (!existing) {
    console.log("Item not in cart.");
    return;
  }

  const qtyInput = (
    await rl.question("Enter new quantity (0 to remove): ")
  ).trim();
  const quantity = parseInt(qtyInput, 10);
  if (isNaN(quantity) || quantity < 0) {
    console.log("Invalid quantity.");
    return;
  }

  currentCart = updateQuantity(currentCart, itemId, quantity);
  console.log("Cart updated successfully.");
  displayCart(currentCart);
}

async function handleRemoveItem(rl: readline.Interface): Promise<void> {
  if (currentCart.length === 0) {
    console.log("Cart is empty.");
    return;
  }

  displayCart(currentCart);
  const idInput = (await rl.question("\nEnter Item ID to remove: ")).trim();
  const itemId = Number(idInput);

  const exists = currentCart.some((i) => i.id === itemId);
  if (!exists) {
    console.log("Item not in cart.");
    return;
  }

  currentCart = removeFromCart(currentCart, itemId);
  console.log("Item removed from cart.");
  displayCart(currentCart);
}

async function handleCheckout(rl: readline.Interface): Promise<void> {
  if (currentCart.length === 0) {
    console.log("Your cart is empty. Add items before checking out.");
    return;
  }

  if (!currentCustomer) {
    console.log("Customer information required before checkout.");
    await handleCustomerSetup(rl);
    if (!currentCustomer) return;
  }

  displayCart(currentCart);

  const subtotal = calculateSubtotal(currentCart);
  console.log(`\nSubtotal: ₹${subtotal}`);

  console.log("\nSelect Payment Method:");
  console.log("1. Cash");
  console.log("2. Card");
  console.log("3. UPI");
  const payChoice = (await rl.question("Choose payment method (1-3): ")).trim();

  let payment: Payment | null = null;

  if (payChoice === "1") {
    const cashStr = (await rl.question("Enter cash received amount (₹): ")).trim();
    const receivedAmount = parseFloat(cashStr);
    if (isNaN(receivedAmount) || receivedAmount <= 0) {
      console.log("Invalid cash amount.");
      return;
    }
    payment = createCashPayment(receivedAmount);
  } else if (payChoice === "2") {
    const cardDigits = (
      await rl.question("Enter last 4 digits of Card: ")
    ).trim();
    payment = createCardPayment(cardDigits);
  } else if (payChoice === "3") {
    const upiId = (await rl.question("Enter UPI Transaction ID: ")).trim();
    payment = createUpiPayment(upiId);
  } else {
    console.log("Invalid payment option selected.");
    return;
  }

  // Pre-calculate bill to get final amount for payment processing
  const dummyOrderId = `ORD-${orderCounter}`;
  const billCheck = generateBill(
    dummyOrderId,
    currentCustomer,
    currentCart,
    payment,
    "confirmed"
  );

  if (billCheck.status === "error") {
    console.log(`Error: ${billCheck.message}`);
    return;
  }

  // Process payment with narrowing
  const payResult = processPayment(payment, billCheck.finalAmount);
  if (!payResult.success) {
    console.log(`Payment Failed: ${payResult.message}`);
    return;
  }

  console.log(`\n${payResult.message}`);
  if (payResult.change !== undefined && payResult.change > 0) {
    console.log(`Change to return: ₹${payResult.change.toFixed(2)}`);
  }

  // Final bill creation
  currentOrderStatus = "confirmed";
  const finalBillResult = generateBill(
    dummyOrderId,
    currentCustomer,
    currentCart,
    payment,
    currentOrderStatus
  );

  // Narrowing discriminated union
  if (finalBillResult.status === "success") {
    lastCompletedBill = finalBillResult;
    orderCounter++;
    printBillSummary(finalBillResult);
    // Reset cart after successful order
    currentCart = [];
  } else {
    console.log(`Bill generation failed: ${finalBillResult.message}`);
  }
}

async function handleOrderStatusChange(rl: readline.Interface): Promise<void> {
  if (!lastCompletedBill) {
    console.log("No active or completed order found to update status for.");
    return;
  }

  displayHeader("ORDER STATUS UPDATE");
  console.log(`Current Order: ${lastCompletedBill.orderId}`);
  console.log(`Current Status: ${lastCompletedBill.orderStatus}`);
  console.log(`Available Statuses: ${ORDER_STATUSES.join(", ")}`);

  const statusInput = (
    await rl.question(
      "Enter new status (pending, confirmed, preparing, delivered, cancelled): "
    )
  )
    .trim()
    .toLowerCase();

  if (!isValidOrderStatus(statusInput)) {
    console.log("Invalid status entered. Must be one of the allowed statuses.");
    return;
  }

  const updatedStatus = updateOrderStatus(
    lastCompletedBill.orderStatus,
    statusInput
  );
  lastCompletedBill = {
    ...lastCompletedBill,
    orderStatus: updatedStatus,
  };
  currentOrderStatus = updatedStatus;

  console.log(
    `Order status updated to '${updatedStatus}'.\nStatus Info: ${getOrderStatusDescription(
      updatedStatus
    )}`
  );
}

// Main application loop
async function main(): Promise<void> {
  const rl = readline.createInterface({ input, output });

  console.log("Welcome to Food Ordering & Billing System!");

  let running = true;
  while (running) {
    console.log("\n================================");
    console.log("      FOOD ORDERING SYSTEM      ");
    console.log("================================");
    console.log("1. View Food Menu");
    console.log("2. Create / Select Customer");
    console.log("3. Add Item to Cart");
    console.log("4. View Cart");
    console.log("5. Update Quantity");
    console.log("6. Remove Item");
    console.log("7. Checkout");
    console.log("8. Change Order Status");
    console.log("9. Exit");

    const option = (await rl.question("\nSelect an option (1-9): ")).trim();

    switch (option) {
      case "1":
        await handleViewMenu(rl);
        break;
      case "2":
        await handleCustomerSetup(rl);
        break;
      case "3":
        await handleAddToCart(rl);
        break;
      case "4":
        displayCart(currentCart);
        break;
      case "5":
        await handleUpdateQuantity(rl);
        break;
      case "6":
        await handleRemoveItem(rl);
        break;
      case "7":
        await handleCheckout(rl);
        break;
      case "8":
        await handleOrderStatusChange(rl);
        break;
      case "9":
        console.log("\nThank you for visiting! Goodbye.");
        running = false;
        break;
      default:
        console.log("Invalid option selected. Please choose between 1 and 9.");
        break;
    }
  }

  rl.close();
}

// Run application
main().catch((err) => {
  console.error("Unexpected error:", err);
});
