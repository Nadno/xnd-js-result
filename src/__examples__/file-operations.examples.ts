import Result, { type AnyResult } from '../result';
import { promises as fs } from 'fs';
import path from 'path';

// Types for file operations
interface FileMetadata {
  name: string;
  path: string;
  size: number;
  type: string;
  lastModified: Date;
}

interface ProcessedFile {
  metadata: FileMetadata;
  outputPath?: string;
  processingTime?: number;
}

interface FileError {
  code: string;
  message: string;
  path?: string;
  recoverable: boolean;
}

// File processor service with Result
class FileProcessor {
  // Validate file before processing
  async validateFile(filePath: string): Promise<AnyResult<FileMetadata, FileError>> {
    try {
      // Check if file exists
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        return Result.not({
          code: 'not_a_file',
          message: 'Path does not point to a file',
          path: filePath,
          recoverable: false
        });
      }
      
      // Get file extension
      const ext = path.extname(filePath).toLowerCase();
      const allowedExtensions = ['.jpg', '.png', '.txt', '.pdf', '.csv'];
      
      if (!allowedExtensions.includes(ext)) {
        return Result.not({
          code: 'invalid_format',
          message: `File format ${ext} is not supported`,
          path: filePath,
          recoverable: false
        });
      }
      
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (stats.size > maxSize) {
        return Result.not({
          code: 'file_too_large',
          message: `File exceeds maximum size of ${maxSize / 1024 / 1024}MB`,
          path: filePath,
          recoverable: false
        });
      }
      
      // Create metadata
      const metadata: FileMetadata = {
        name: path.basename(filePath),
        path: filePath,
        size: stats.size,
        type: this.getFileType(ext),
        lastModified: stats.mtime
      };
      
      return Result.ok(metadata);
    } catch (error) {
      return Result.not({
        code: 'file_access_error',
        message: error instanceof Error ? error.message : 'Unknown error accessing file',
        path: filePath,
        recoverable: true
      });
    }
  }
  
  // Process a file based on its type
  async processFile(filePath: string): Promise<AnyResult<ProcessedFile, FileError>> {
    const startTime = Date.now();
    
    // Validate the file first
    const validationResult = await this.validateFile(filePath);
    
    if (Result.notOk(validationResult)) {
      return Result.not(validationResult.error);
    }
    
    const metadata = validationResult.data;
    const ext = path.extname(filePath).toLowerCase();
    
    try {
      let outputPath: string | undefined;
      
      // Process based on file type
      switch (ext) {
        case '.jpg':
        case '.png':
          // Simulate image processing
          outputPath = await this.processImage(filePath);
          break;
        case '.txt':
        case '.csv':
          // Simulate text processing
          outputPath = await this.processTextFile(filePath);
          break;
        case '.pdf':
          // Simulate PDF processing
          outputPath = await this.processPdf(filePath);
          break;
      }
      
      return Result.ok({
        metadata,
        outputPath,
        processingTime: Date.now() - startTime
      });
    } catch (error) {
      return Result.not({
        code: 'processing_error',
        message: error instanceof Error ? error.message : 'Unknown processing error',
        path: filePath,
        recoverable: true
      });
    }
  }
  
  // Process multiple files, handling failures individually
  async processMultipleFiles(
    filePaths: string[]
  ): Promise<AnyResult<ProcessedFile[], FileError[]>> {
    const results: ProcessedFile[] = [];
    const errors: FileError[] = [];
    
    // Process each file
    for (const filePath of filePaths) {
      const result = await this.processFile(filePath);
      
      if (Result.isOk(result)) {
        results.push(result.data);
      } else {
        errors.push(result.error);
      }
    }
    
    // Return success only if all files were processed successfully
    return errors.length === 0
      ? Result.ok(results)
      : Result.not(errors);
  }
  
  // Convert a file to a different format
  async convertFile(
    filePath: string, 
    targetFormat: string
  ): Promise<AnyResult<string, FileError>> {
    const validationResult = await this.validateFile(filePath);
    
    if (Result.notOk(validationResult)) {
      return Result.not(validationResult.error);
    }
    
    const sourceExt = path.extname(filePath).toLowerCase();
    const targetExt = targetFormat.startsWith('.') ? targetFormat : `.${targetFormat}`;
    
    // Check if conversion is supported
    const supportedConversions = new Map<string, string[]>([
      ['.jpg', ['.png', '.pdf']],
      ['.png', ['.jpg', '.pdf']],
      ['.txt', ['.pdf', '.html']],
      ['.csv', ['.xlsx', '.json', '.txt']]
    ]);
    
    const allowedTargets = supportedConversions.get(sourceExt) || [];
    
    if (!allowedTargets.includes(targetExt)) {
      return Result.not({
        code: 'unsupported_conversion',
        message: `Cannot convert from ${sourceExt} to ${targetExt}`,
        path: filePath,
        recoverable: false
      });
    }
    
    // Simulate conversion process
    try {
      const outputPath = filePath.replace(sourceExt, targetExt);
      
      // In a real application, actual conversion would happen here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return Result.ok(outputPath);
    } catch (error) {
      return Result.not({
        code: 'conversion_error',
        message: error instanceof Error ? error.message : 'Unknown conversion error',
        path: filePath,
        recoverable: true
      });
    }
  }
  
  // Helper methods for different file types
  private async processImage(filePath: string): Promise<string> {
    // Simulate image processing
    const outputPath = `${filePath}.processed.jpg`;
    await new Promise(resolve => setTimeout(resolve, 500));
    return outputPath;
  }
  
  private async processTextFile(filePath: string): Promise<string> {
    // Simulate text processing
    const outputPath = `${filePath}.processed.txt`;
    await new Promise(resolve => setTimeout(resolve, 200));
    return outputPath;
  }
  
  private async processPdf(filePath: string): Promise<string> {
    // Simulate PDF processing
    const outputPath = `${filePath}.processed.pdf`;
    await new Promise(resolve => setTimeout(resolve, 800));
    return outputPath;
  }
  
  private getFileType(extension: string): string {
    const typeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.png': 'image/png',
      '.txt': 'text/plain',
      '.pdf': 'application/pdf',
      '.csv': 'text/csv'
    };
    
    return typeMap[extension] || 'application/octet-stream';
  }
}

// Example usage
async function main() {
  const processor = new FileProcessor();
  
  // Example file paths (these would be real paths in an actual application)
  const filePaths = [
    '/path/to/document.txt',
    '/path/to/image.jpg',
    '/path/to/spreadsheet.csv',
    '/path/to/large_file.pdf',  // Simulating a file that's too large
    '/path/to/unsupported.exe'  // Unsupported format
  ];
  
  // Simulate validation
  console.log('Validating files:');
  for (const filePath of filePaths) {
    const result = await processor.validateFile(filePath);
    
    if (Result.isOk(result)) {
      console.log(`✅ ${filePath}: Valid (${result.data.size} bytes)`);
    } else {
      console.log(`❌ ${filePath}: Invalid - ${result.error.message}`);
    }
  }
  
  // Simulate batch processing
  console.log('\nProcessing multiple files:');
  const batchResult = await processor.processMultipleFiles(filePaths);
  
  if (Result.isOk(batchResult)) {
    console.log('All files processed successfully:');
    batchResult.data.forEach(file => {
      console.log(`- ${file.metadata.name} -> ${file.outputPath}`);
    });
  } else {
    console.log(`Some files failed to process (${batchResult.error.length} errors):`);
    batchResult.error.forEach(error => {
      console.log(`- ${error.path}: ${error.message}`);
    });
  }
  
  // Simulate file conversion
  console.log('\nConverting files:');
  const conversionResult = await processor.convertFile('/path/to/document.txt', 'pdf');
  
  if (Result.isOk(conversionResult)) {
    console.log(`Conversion successful: ${conversionResult.data}`);
  } else {
    console.log(`Conversion failed: ${conversionResult.error.message}`);
  }
}

main().catch(console.error);
