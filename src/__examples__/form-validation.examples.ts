import Result, { type AnyResult } from '../result';

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// User registration form example
interface RegistrationForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  age: number;
}

// Form validation with Result
class FormValidator {
  // Validate a single field
  static validateUsername(username: string): AnyResult<string, ValidationError> {
    if (!username) {
      return Result.not({ 
        field: 'username', 
        message: 'Username is required', 
        code: 'required' 
      });
    }
    
    if (username.length < 3) {
      return Result.not({ 
        field: 'username', 
        message: 'Username must be at least 3 characters', 
        code: 'min_length' 
      });
    }
    
    if (username.length > 20) {
      return Result.not({ 
        field: 'username', 
        message: 'Username cannot exceed 20 characters', 
        code: 'max_length' 
      });
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return Result.not({ 
        field: 'username', 
        message: 'Username can only contain letters, numbers and underscores', 
        code: 'invalid_format' 
      });
    }
    
    return Result.ok(username);
  }
  
  // Async validation - check if username exists
  static async checkUsernameAvailability(
    username: string
  ): Promise<AnyResult<string, ValidationError>> {
    // Simulate API call to check username
    return Result.resolve<string, ValidationError>(
      new Promise((resolve, reject) => {
        setTimeout(() => {
          if (username === 'admin') {
            reject({ 
              field: 'username', 
              message: 'This username is already taken', 
              code: 'already_exists' 
            });
          } else {
            resolve(username);
          }
        }, 500);
      })
    );
  }
  
  // Validate complete form
  static async validateForm(
    form: RegistrationForm
  ): Promise<AnyResult<RegistrationForm, ValidationError[]>> {
    const errors: ValidationError[] = [];
    
    // Username validation with chained operations
    const usernameResult = FormValidator.validateUsername(form.username);
    if (Result.notOk(usernameResult)) {
      errors.push(usernameResult.error);
    } else {
      // Only check availability if basic validation passes
      const availabilityResult = await FormValidator.checkUsernameAvailability(form.username);
      if (Result.notOk(availabilityResult)) {
        errors.push(availabilityResult.error);
      }
    }
    
    // More validations would go here...
    
    // Check if passwords match
    if (form.password !== form.confirmPassword) {
      errors.push({
        field: 'confirmPassword',
        message: 'Passwords do not match',
        code: 'passwords_mismatch'
      });
    }
    
    // Return form data or validation errors
    return errors.length === 0
      ? Result.ok(form)
      : Result.not(errors);
  }
}

// Usage example
async function main() {
  // Valid form
  const validForm: RegistrationForm = {
    username: 'john_doe',
    email: 'john@example.com',
    password: 'Secret123!',
    confirmPassword: 'Secret123!',
    age: 25
  };
  
  // Invalid form
  const invalidForm: RegistrationForm = {
    username: 'a', // too short
    email: 'not-an-email',
    password: '123',
    confirmPassword: '1234', // doesn't match
    age: 15
  };
  
  // Validate forms
  const validResult = await FormValidator.validateForm(validForm);
  const invalidResult = await FormValidator.validateForm(invalidForm);
  
  // Handle valid submission
  if (Result.isOk(validResult)) {
    console.log('Form submitted successfully!', validResult.data);
    // Would normally save to database, etc.
  }
  
  // Handle validation errors
  if (Result.notOk(invalidResult)) {
    console.log('Form has validation errors:');
    invalidResult.error.forEach(err => {
      console.log(`- ${err.field}: ${err.message} (${err.code})`);
    });
  }
}

main().catch(console.error);
