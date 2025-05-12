import Result, { type AnyResult } from '../result';

// Types for business logic
interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
}

interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

type OrderStatus = 'pending' | 'approved' | 'rejected' | 'shipped' | 'delivered';

// Error types
interface BusinessError {
  code: string;
  message: string;
  context?: Record<string, any>;
}

// Example service layer
class OrderService {
  // Simulate dependency services
  private inventoryService = new InventoryService();
  private paymentService = new PaymentService();
  private notificationService = new NotificationService();
  
  // Process an order with complex business rules
  async processOrder(order: Order): Promise<AnyResult<Order, BusinessError>> {
    // Step 1: Validate inventory
    const inventoryResult = await this.inventoryService.checkInventory(order.items);
    
    if (Result.notOk(inventoryResult)) {
      return Result.not({
        code: 'inventory_issue',
        message: 'Cannot fulfill order due to inventory issues',
        context: { originalError: inventoryResult.error }
      });
    }
    
    // Step 2: Process payment
    const paymentResult = await this.paymentService.processPayment(
      order.customerId,
      order.totalAmount
    );
    
    if (Result.notOk(paymentResult)) {
      // Payment failed, return the specific business error
      return Result.not(paymentResult.error);
    }
    
    // Step 3: Update order status
    const updatedOrder: Order = {
      ...order,
      status: 'approved'
    };
    
    // Step 4: Send notification (non-critical)
    this.notificationService.sendOrderConfirmation(order.customerId, order.id)
      .then(result => {
        if (Result.notOk(result)) {
          console.error('Failed to send notification', result.error);
          // This doesn't affect order processing
        }
      });
    
    return Result.ok(updatedOrder);
  }
}

// Supporting services (simplified)
class InventoryService {
  async checkInventory(
    items: OrderItem[]
  ): Promise<AnyResult<boolean, BusinessError>> {
    // Simulate inventory check
    const insufficientItems = items.filter(item => 
      item.productId === 'out-of-stock' || item.quantity > 100
    );
    
    if (insufficientItems.length > 0) {
      return Result.not({
        code: 'insufficient_inventory',
        message: 'Some items are not available in requested quantity',
        context: { items: insufficientItems }
      });
    }
    
    return Result.ok(true);
  }
}

class PaymentService {
  async processPayment(
    customerId: string, 
    amount: number
  ): Promise<AnyResult<string, BusinessError>> {
    // Simulate payment processing
    if (amount > 10000) {
      return Result.not({
        code: 'payment_limit_exceeded',
        message: 'Payment amount exceeds authorized limit',
        context: { limit: 10000, attempted: amount }
      });
    }
    
    if (customerId === 'blocked-customer') {
      return Result.not({
        code: 'customer_payment_blocked',
        message: 'Customer account has payment restrictions',
      });
    }
    
    // Generate payment reference
    return Result.ok(`payment-${Date.now()}`);
  }
}

class NotificationService {
  async sendOrderConfirmation(
    customerId: string, 
    orderId: string
  ): Promise<AnyResult<boolean, BusinessError>> {
    console.log('***ORDER_ID:', orderId);

    // Simulate notification sending
    if (customerId === 'no-email') {
      return Result.not({
        code: 'notification_failed',
        message: 'Could not send email notification',
        context: { reason: 'No email address on file' }
      });
    }
    
    
    return Result.ok(true);
  }
}

// Usage
async function main() {
  const orderService = new OrderService();
  
  // Create sample order
  const order: Order = {
    id: 'ord-123',
    customerId: 'cust-456',
    items: [
      { productId: 'prod-1', quantity: 2, unitPrice: 25 },
      { productId: 'prod-2', quantity: 1, unitPrice: 50 }
    ],
    totalAmount: 100,
    status: 'pending'
  };
  
  // Process the order
  const result = await orderService.processOrder(order);
  
  if (Result.isOk(result)) {
    const approvedOrder = result.data;
    console.log(`Order ${approvedOrder.id} processed successfully`);
    console.log(`New status: ${approvedOrder.status}`);
  } else {
    // Handle different error types based on the error code
    const error = result.error;
    
    switch (error.code) {
      case 'inventory_issue':
        console.error('Order cannot be fulfilled due to inventory issues');
        break;
      case 'payment_limit_exceeded':
        console.error(
          `Payment limit exceeded. Max: ${error.context?.limit}, ` +
          `Attempted: ${error.context?.attempted}`
        );
        break;
      case 'customer_payment_blocked':
        console.error('Customer account has payment restrictions');
        break;
      default:
        console.error(`Order processing failed: ${error.message}`);
    }
  }
}

main().catch(console.error);
