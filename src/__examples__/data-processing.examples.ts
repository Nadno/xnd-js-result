import Result, { type AnyResult } from '../result';

interface DataItem {
  id: string;
  value: number;
}

interface ProcessingStats {
  processed: number;
  succeeded: number;
  failed: number;
}

interface ProcessingError {
  itemId: string;
  reason: string;
  retryable: boolean;
}

// Data processing pipeline with Result
class DataProcessor {
  // Process a batch of items, handling partial failures
  async processBatch(items: DataItem[]): Promise<AnyResult<ProcessingStats, ProcessingError[]>> {
    const errors: ProcessingError[] = [];
    let succeeded = 0;
    
    // Process each item and collect results
    const processPromises = items.map(item => 
      this.processItem(item)
        .then(result => {
          if (Result.isOk(result)) {
            succeeded++;
            return null;
          } else {
            errors.push(result.error);
            return result.error;
          }
        })
    );
    
    // Wait for all items to be processed
    await Promise.all(processPromises);
    
    // Create processing stats
    const stats: ProcessingStats = {
      processed: items.length,
      succeeded,
      failed: errors.length
    };
    
    // Return stats if all succeeded, otherwise return errors
    return errors.length === 0
      ? Result.ok(stats)
      : Result.not(errors);
  }
  
  // Process a single item
  private async processItem(item: DataItem): Promise<AnyResult<boolean, ProcessingError>> {
    // Simulate processing logic with potential failures
    if (item.id.includes('invalid')) {
      return Result.not({
        itemId: item.id,
        reason: 'Invalid item format',
        retryable: false
      });
    }
    
    if (item.value < 0) {
      return Result.not({
        itemId: item.id,
        reason: 'Negative values not allowed',
        retryable: false
      });
    }
    
    if (item.value > 1000) {
      return Result.not({
        itemId: item.id,
        reason: 'Temporary processing error',
        retryable: true
      });
    }
    
    // Success case
    return Result.ok(true);
  }
  
  // Process items with automatic retry for recoverable errors
  async processWithRetry(
    items: DataItem[], 
    maxRetries: number = 3
  ): Promise<AnyResult<ProcessingStats, ProcessingError[]>> {
    let currentItems = [...items];
    let finalStats: ProcessingStats = { processed: 0, succeeded: 0, failed: 0 };
    let attempts = 0;
    
    while (currentItems.length > 0 && attempts < maxRetries) {
      attempts++;
      
      // Process current batch
      const batchResult = await this.processBatch(currentItems);
      
      if (Result.isOk(batchResult)) {
        // All items processed successfully
        const stats = batchResult.data;
        finalStats.processed += stats.processed;
        finalStats.succeeded += stats.succeeded;
        break;
      } else {
        // Some items failed
        const errors = batchResult.error;
        
        // Count non-retryable failures
        const nonRetryableErrors = errors.filter(e => !e.retryable);
        finalStats.failed += nonRetryableErrors.length;
        
        // Only retry items with retryable errors
        const retryableItemIds = errors
          .filter(e => e.retryable)
          .map(e => e.itemId);
        
        currentItems = currentItems.filter(item => 
          retryableItemIds.includes(item.id)
        );
        
        // If no retryable items left, exit loop
        if (currentItems.length === 0) {
          break;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempts)));
      }
    }
    
    // If we still have items after max retries, count them as failed
    if (currentItems.length > 0) {
      finalStats.failed += currentItems.length;
    }
    
    return finalStats.failed === 0
      ? Result.ok(finalStats)
      : Result.not(currentItems.map(item => ({
          itemId: item.id,
          reason: 'Failed after max retry attempts',
          retryable: false
        })));
  }
}

// Usage example
async function main() {
  const processor = new DataProcessor();
  
  // Mixed batch with some failures
  const items: DataItem[] = [
    { id: 'item-1', value: 50 },
    { id: 'invalid-2', value: 30 },
    { id: 'item-3', value: -10 },
    { id: 'item-4', value: 2000 }, // Will fail but is retryable
  ];
  
  // Standard processing
  console.log('Processing batch...');
  const result = await processor.processBatch(items);
  
  if (Result.isOk(result)) {
    console.log('All items processed successfully:', result.data);
  } else {
    const errors = result.error;
    console.log(`Processing completed with ${errors.length} errors:`);
    errors.forEach(err => {
      console.log(`- Item ${err.itemId}: ${err.reason} (${err.retryable ? 'retryable' : 'permanent'})`);
    });
  }
  
  // Processing with retry
  console.log('\nProcessing with retry...');
  const retryResult = await processor.processWithRetry(items);
  
  if (Result.isOk(retryResult)) {
    console.log('All items processed successfully after retries:', retryResult.data);
  } else {
    console.log('Some items still failed after maximum retries:', retryResult.error.length);
  }
}

main().catch(console.error);
