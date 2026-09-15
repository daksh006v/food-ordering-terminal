import { Customer, GuestCustomer, MemberCustomer, MembershipLevel } from "./types.js";

// Factory function to create a Guest customer
export function createGuestCustomer(
  id: number,
  name: string,
  address: string,
  phone?: string
): GuestCustomer {
  return {
    id,
    name,
    address,
    ...(phone !== undefined && { phone }),
    type: "guest",
  };
}

// Map membership level to discount percentage
export function getDiscountPercentageByLevel(level: MembershipLevel): number {
  switch (level) {
    case "silver":
      return 5;
    case "gold":
      return 10;
    case "platinum":
      return 15;
    default:
      return 0;
  }
}

// Factory function to create a Member customer
export function createMemberCustomer(
  id: number,
  name: string,
  address: string,
  membershipLevel: MembershipLevel,
  phone?: string
): MemberCustomer {
  const discountPercentage = getDiscountPercentageByLevel(membershipLevel);
  const membershipId = `MEM-${membershipLevel.toUpperCase()}-${id}`;

  return {
    id,
    name,
    address,
    ...(phone !== undefined && { phone }),
    type: "member",
    membershipId,
    membershipLevel,
    discountPercentage,
  };
}

// Type guard narrowing Customer to MemberCustomer using the 'in' operator
export function isMember(customer: Customer): customer is MemberCustomer {
  return "membershipId" in customer && "membershipLevel" in customer;
}

// Get the customer's discount percentage safely
export function getCustomerDiscountPercentage(customer: Customer): number {
  if (isMember(customer)) {
    return customer.discountPercentage;
  }
  return 0;
}
