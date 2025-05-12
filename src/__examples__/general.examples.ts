import Result, { type AnyResult } from '../result';

// ======== Basic Examples ========

// Simple success case
const successResult = Result.ok(42);
console.log('Simple success:', successResult.data); // 42

// Simple error case
const errorResult = Result.not(new Error('Something went wrong'));
console.log('Simple error:', errorResult.error?.message); // "Something went wrong"

// Using Result.from with validation
const validatePositiveNumber = (num: number) =>
  Result.from(num, (value) => value > 0, new Error('Number must be positive'));

console.log('Validation success:', validatePositiveNumber(5).data); // 5
console.log('Validation error:', validatePositiveNumber(-5).error?.message); // "Number must be positive"

// ======== Frontend Examples ========

// Form validation example
interface UserForm {
  username: string;
  email: string;
  age: number;
}

const validateUserForm = (form: UserForm): AnyResult<UserForm> => {
  if (!form.username || form.username.length < 3) {
    return Result.not(new Error('Username must be at least 3 characters'));
  }

  if (!form.email.includes('@')) {
    return Result.not(new Error('Invalid email format'));
  }

  if (form.age < 18) {
    return Result.not(new Error('Must be 18 or older'));
  }

  return Result.ok(form);
};

// Simulating form submission
const handleFormSubmit = async (
  form: UserForm,
): Promise<AnyResult<UserForm, Error>> => {
  const validationResult = validateUserForm(form);

  if (Result.notOk(validationResult)) {
    console.error('Form validation failed:', validationResult.error?.message);
    return validationResult;
  }

  // Simulate API call
  return Result.resolve(
    new Promise<UserForm>((resolve) => {
      setTimeout(() => resolve(form), 1000);
    }),
  );
};

// ======== Backend Examples ========

// Database operations example
interface User {
  id: number;
  name: string;
}

// Simulating database operations
class UserRepository {
  private users: Map<number, User> = new Map();

  async findById(id: number): Promise<AnyResult<User>> {
    return Result.tryCatchAsync(async () => {
      const user = this.users.get(id);
      if (!user) throw new Error('User not found');
      return user;
    });
  }

  async create(user: User): Promise<AnyResult<User>> {
    return Result.tryCatchAsync(async () => {
      if (this.users.has(user.id)) {
        throw new Error('User already exists');
      }
      this.users.set(user.id, user);
      return user;
    });
  }
}

// ======== Complex Chaining Example ========

// Simulating a complex business operation
interface Order {
  id: number;
  userId: number;
  items: string[];
}

const validateOrder = (order: Order): AnyResult<Order> =>
  Result.from(
    order,
    (o) => o.items.length > 0,
    new Error('Order must have at least one item'),
  );

const processOrder = async (order: Order): Promise<AnyResult<string>> => {
  const userRepo = new UserRepository();

  // Chain of operations
  const userResult = await userRepo.findById(order.userId);

  if (Result.notOk(userResult)) {
    return Result.not(userResult.error);
  }

  const orderValidation = validateOrder(order);
  if (Result.notOk(orderValidation)) {
    return Result.not(orderValidation.error);
  }

  // Simulate order processing
  return Result.resolve(
    new Promise<string>((resolve) => {
      setTimeout(
        () => resolve(`Order ${order.id} processed successfully`),
        500,
      );
    }),
  );
};

// ======== Usage Examples ========

const runExamples = async () => {
  // Frontend example
  const formData: UserForm = {
    username: 'john_doe',
    email: 'john@example.com',
    age: 25,
  };

  const formResult = await handleFormSubmit(formData);
  console.log(
    'Form submission:',
    Result.isOk(formResult) ? formResult.data : formResult.error?.message,
  );

  // Backend example
  const userRepo = new UserRepository();
  const createResult = await userRepo.create({ id: 1, name: 'John Doe' });
  console.log(
    'User creation:',
    Result.isOk(createResult) ? 'Success' : createResult.error?.message,
  );

  // Complex example
  const order: Order = {
    id: 1,
    userId: 1,
    items: ['item1', 'item2'],
  };

  const processResult = await processOrder(order);
  console.log(
    'Order processing:',
    Result.isOk(processResult)
      ? processResult.data
      : processResult.error?.message,
  );
};

// Run all examples
runExamples().catch(console.error);
