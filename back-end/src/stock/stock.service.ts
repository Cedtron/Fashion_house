import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stock } from '../entities/stock.entity';
import { Shade } from '../entities/shade.entity';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { SearchStockDto } from './dto/search-stock.dto';
import { StockTrackingService } from './stock-tracking.service';
import { StockAction, StockTracking } from '../entities/stock-tracking.entity';
import { existsSync, unlinkSync } from 'fs';

// Try importing as CommonJS module
let imageHash: any;

try {
  // This handles both ESM and CommonJS imports
  imageHash = require('image-hash');
  // If it has a default export, use it
  if (imageHash && imageHash.default) {
    imageHash = imageHash.default;
  }
} catch (error) {
  console.error('Error importing image-hash:', error);
  // Fallback - mock function if module fails to load
  imageHash = () => {};
}

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Stock)
    private readonly stockRepository: Repository<Stock>,
    @InjectRepository(Shade)
    private readonly shadeRepository: Repository<Shade>,
    private readonly trackingService: StockTrackingService,
  ) { }

  // Lazy-loaded CLIP embedding pipeline (no TFJS downgrade required)
  private clipExtractorPromise: Promise<any> | null = null;
  private readonly embeddingCache = new Map<string, number[]>();

  private async generateStockId(): Promise<string> {
    try {
      // Find the highest stockId in the database
      const lastStock = await this.stockRepository
        .createQueryBuilder('stock')
        .where('stock.stockId LIKE :prefix', { prefix: 'FH%' })
        .orderBy('stock.id', 'DESC')
        .getOne();

      let nextNumber = 1;

      if (lastStock && lastStock.stockId) {
        // Extract the number from the last stockId (e.g., "FH001" -> 1)
        const lastNumber = parseInt(lastStock.stockId.replace('FH', ''), 10);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }

      // Format as FH001, FH002, etc.
      return `FH${nextNumber.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating stock ID:', error);
      // Fallback: use timestamp to ensure uniqueness
      return `FH${Date.now().toString().slice(-6)}`;
    }
  }

  async create(createStockDto: CreateStockDto, username: string): Promise<Stock> {
    try {
      // Generate unique stockId first
      const stockId = await this.generateStockId();

      // Create stock with generated stockId
      const stockData = {
        stockId: stockId, // Add the generated stockId
        product: createStockDto.product,
        category: createStockDto.category,
        quantity: Number(createStockDto.quantity) || 0,
        cost: Number(createStockDto.cost) || 0,
        price: Number(createStockDto.price) || 0,
        imagePath: createStockDto.imagePath,
      };

      console.log('Creating stock with ID:', stockId);

      const stock = this.stockRepository.create(stockData);
      const savedStock = await this.stockRepository.save(stock);

      // Create shades if provided
      let createdShades = [];
      if (createStockDto.shades && createStockDto.shades.length > 0) {
        for (const shadeData of createStockDto.shades) {
          const shade = this.shadeRepository.create({
            colorName: shadeData.colorName,
            color: shadeData.color,
            quantity: Number(shadeData.quantity) || 0,
            unit: shadeData.unit,
            length: Number(shadeData.length) || 0,
            lengthUnit: shadeData.lengthUnit,
            stock: savedStock,
            stockId: savedStock.id,
          });
          const savedShade = await this.shadeRepository.save(shade);
          createdShades.push(savedShade);
        }
      }

      // Get complete stock with relations
      const completeStock = await this.stockRepository.findOne({
        where: { id: savedStock.id },
        relations: ['shades'],
      });

      // Single tracking entry
      await this.trackingService.logAction(
        completeStock,
        StockAction.CREATE,
        username,
        `Created stock: ${completeStock.product} (${completeStock.stockId}) with ${createdShades.length} shades`,
        null,
        this.prepareCompleteStockData(completeStock),
      );

      return completeStock;
    } catch (error) {
      console.error('Error creating stock:', error);
      throw error;
    }
  }

  async update(id: number, updateStockDto: UpdateStockDto, username: string): Promise<Stock> {
    try {
      const stock = await this.findOne(id);
      const oldData = this.prepareCompleteStockData(stock);

      // Track stock changes (exclude shades from stock-level comparison)
      const stockChanges = this.getChangedFields(oldData, updateStockDto);

      // Update stock (only stock fields, not shades)
      const stockUpdateData = { ...updateStockDto };
      delete stockUpdateData.shades; // Remove shades from stock update

      const updatedStock = this.stockRepository.merge(stock, stockUpdateData);
      const savedStock = await this.stockRepository.save(updatedStock);

      // Handle shade updates if provided
      let shadeChanges = [];
      if (updateStockDto.shades && Array.isArray(updateStockDto.shades)) {
        shadeChanges = await this.updateShades(id, updateStockDto.shades);
      }

      // Get complete updated data
      const completeStock = await this.stockRepository.findOne({
        where: { id: savedStock.id },
        relations: ['shades'],
      });

      const newData = this.prepareCompleteStockData(completeStock);

      // Create comprehensive description
      const changeDescriptions = [];

      if (Object.keys(stockChanges).length > 0) {
        const stockChangeText = Object.keys(stockChanges).map(field =>
          `${field}: ${stockChanges[field].old} → ${stockChanges[field].new}`
        ).join(', ');
        changeDescriptions.push(`Stock: ${stockChangeText}`);
      }

      if (shadeChanges.length > 0) {
        const shadeChangeText = shadeChanges.map(change =>
          `${change.action} shade: ${change.colorName}`
        ).join(', ');
        changeDescriptions.push(`Shades: ${shadeChangeText}`);
      }

      const description = changeDescriptions.length > 0
        ? `Updated ${completeStock.product}: ${changeDescriptions.join(' | ')}`
        : `Updated ${completeStock.product} (no significant changes detected)`;

      // Single tracking entry
      await this.trackingService.logAction(
        completeStock,
        StockAction.UPDATE,
        username,
        description,
        oldData,
        newData,
      );

      return completeStock;
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  }

  /**
   * Complete stock update with shades (handles frontend batch reductions)
   * This method accepts the full stock object with shades array
   */
  async completeUpdate(id: number, updatePayload: any, username: string): Promise<Stock> {
    try {
      console.log('Complete update for stock', id, 'payload:', updatePayload);
      
      // Get current stock with shades
      const stock = await this.findOne(id);
      const oldData = this.prepareCompleteStockData(stock);
      
      // Track changes for logging
      const changes: string[] = [];
      
      // 1. Update main stock fields if provided
      const stockFields = ['product', 'category', 'quantity', 'cost', 'price', 'imagePath'];
      let hasStockChanges = false;
      
      stockFields.forEach(field => {
        if (updatePayload[field] !== undefined && updatePayload[field] !== null) {
          const oldValue = stock[field];
          const newValue = updatePayload[field];
          
          if (oldValue !== newValue) {
            stock[field] = newValue;
            hasStockChanges = true;
            
            if (field === 'quantity') {
              const diff = Number(newValue) - Number(oldValue);
              if (diff !== 0) {
                changes.push(`${field}: ${oldValue} → ${newValue} (${diff > 0 ? '+' : ''}${diff})`);
              }
            } else {
              changes.push(`${field}: ${oldValue} → ${newValue}`);
            }
          }
        }
      });
      
      // Save stock changes if any
      if (hasStockChanges) {
        await this.stockRepository.save(stock);
      }
      
      // 2. Handle shades if provided (this is where frontend reductions come in)
      let shadeUpdates = { created: 0, updated: 0, deleted: 0, details: [] as string[] };
      
      if (updatePayload.shades && Array.isArray(updatePayload.shades)) {
        shadeUpdates = await this.handleShadeUpdates(id, updatePayload.shades);
        
        if (shadeUpdates.updated > 0 || shadeUpdates.created > 0 || shadeUpdates.deleted > 0) {
          changes.push(`Shades: ${shadeUpdates.created} created, ${shadeUpdates.updated} updated, ${shadeUpdates.deleted} deleted`);
          if (shadeUpdates.details.length > 0) {
            changes.push(...shadeUpdates.details);
          }
        }
      }
      
      // 3. Get updated stock with relations
      const completeStock = await this.stockRepository.findOne({
        where: { id },
        relations: ['shades'],
      });
      
      const newData = this.prepareCompleteStockData(completeStock);
      
      // 4. Log the action
      const description = changes.length > 0 
        ? `Updated ${completeStock.product} (${completeStock.stockId}): ${changes.join(' | ')}`
        : `Updated ${completeStock.product} (no changes detected)`;
      
      await this.trackingService.logAction(
        completeStock,
        StockAction.UPDATE,
        username,
        description,
        oldData,
        newData,
      );
      
      console.log('Complete update successful:', description);
      return completeStock;
    } catch (error) {
      console.error('Complete update error:', error);
      throw error;
    }
  }

  /**
   * Handle shade updates including reductions
   */
  private async handleShadeUpdates(stockId: number, shadesArray: any[]): Promise<{
    created: number;
    updated: number;
    deleted: number;
    details: string[];
  }> {
    const result = { created: 0, updated: 0, deleted: 0, details: [] as string[] };
    
    // Get existing shades
    const existingShades = await this.shadeRepository.find({ 
      where: { stockId } 
    });
    
    const existingMap = new Map<number, Shade>();
    existingShades.forEach(shade => existingMap.set(shade.id, shade));
    
    const processedIds = new Set<number>();
    
    // Process shades from payload
    for (const shadeData of shadesArray) {
      if (shadeData.id && existingMap.has(shadeData.id)) {
        // Update existing shade
        const existing = existingMap.get(shadeData.id)!;
        
        // Track changes
        const changes: string[] = [];
        
        // Check quantity change
        const oldQuantity = existing.quantity;
        const newQuantity = Number(shadeData.quantity) || 0;
        if (oldQuantity !== newQuantity) {
          const diff = newQuantity - oldQuantity;
          changes.push(`quantity: ${oldQuantity} → ${newQuantity} (${diff > 0 ? '+' : ''}${diff})`);
        }
        
        // Update other fields
        const updatedFields: any = {};
        
        if (shadeData.colorName !== undefined && shadeData.colorName !== existing.colorName) {
          updatedFields.colorName = shadeData.colorName;
          changes.push(`colorName: ${existing.colorName} → ${shadeData.colorName}`);
        }
        
        if (shadeData.color !== undefined && shadeData.color !== existing.color) {
          updatedFields.color = shadeData.color;
          changes.push(`color: ${existing.color} → ${shadeData.color}`);
        }
        
        if (shadeData.unit !== undefined && shadeData.unit !== existing.unit) {
          updatedFields.unit = shadeData.unit;
        }
        
        if (shadeData.length !== undefined && Number(shadeData.length) !== existing.length) {
          updatedFields.length = Number(shadeData.length) || 0;
        }
        
        if (shadeData.lengthUnit !== undefined && shadeData.lengthUnit !== existing.lengthUnit) {
          updatedFields.lengthUnit = shadeData.lengthUnit;
        }
        
        updatedFields.quantity = newQuantity;
        
        // Save if there are changes
        if (changes.length > 0 || Object.keys(updatedFields).length > 0) {
          await this.shadeRepository.save({
            ...existing,
            ...updatedFields
          });
          
          result.updated++;
          result.details.push(`${existing.colorName}: ${changes.join(', ')}`);
        }
        
        processedIds.add(shadeData.id);
      } else if (!shadeData.id) {
        // Create new shade
        const newShade = this.shadeRepository.create({
          colorName: shadeData.colorName,
          color: shadeData.color || '#000000',
          quantity: Number(shadeData.quantity) || 0,
          unit: shadeData.unit || 'pcs',
          length: Number(shadeData.length) || 0,
          lengthUnit: shadeData.lengthUnit || 'meters',
          stockId: stockId,
        });
        
        const saved = await this.shadeRepository.save(newShade);
        result.created++;
        result.details.push(`New shade: ${saved.colorName} (${saved.quantity})`);
      }
    }
    
    // Delete shades not in payload
    for (const [id, shade] of existingMap.entries()) {
      if (!processedIds.has(id)) {
        await this.shadeRepository.remove(shade);
        result.deleted++;
        result.details.push(`Deleted shade: ${shade.colorName}`);
      }
    }
    
    return result;
  }

  // ADD THIS SIMPLE UPDATE METHOD IF YOU STILL NEED IT:
  async simpleUpdate(id: number, updateData: any, username: string): Promise<Stock> {
    try {
      console.log('Simple update for stock', id, 'data:', updateData);
      
      // Get stock
      const stock = await this.findOne(id);
      const oldData = this.prepareCompleteStockData(stock);
      
      // Only update fields that frontend sends
      const fields = ['product', 'category', 'quantity', 'cost', 'price', 'imagePath'];
      const updatePayload: any = {};
      
      fields.forEach(field => {
        if (updateData[field] !== undefined && updateData[field] !== null) {
          updatePayload[field] = updateData[field];
        }
      });
      
      // Update stock
      Object.assign(stock, updatePayload);
      const savedStock = await this.stockRepository.save(stock);
      
      // Handle shades if provided
      let shadeChanges = [];
      if (updateData.shades && Array.isArray(updateData.shades)) {
        shadeChanges = await this.simpleUpdateShades(id, updateData.shades);
      }
      
      // Get updated stock
      const completeStock = await this.stockRepository.findOne({
        where: { id: savedStock.id },
        relations: ['shades'],
      });
      
      const newData = this.prepareCompleteStockData(completeStock);
      
      // Track with shade details
      let shadeDetails = '';
      if (shadeChanges.length > 0) {
        const created = shadeChanges.filter(c => c.action === 'created').length;
        const updated = shadeChanges.filter(c => c.action === 'updated');
        const deleted = shadeChanges.filter(c => c.action === 'deleted').length;
        
        shadeDetails = ` | Shades: ${created} new, ${updated.length} updated, ${deleted} removed`;
        
        // Add shade colors for updated ones
        if (updated.length > 0) {
          const shadeColors = updated.map(u => u.colorName).join(', ');
          shadeDetails += ` (Updated colors: ${shadeColors})`;
        }
      }
      
      await this.trackingService.logAction(
        completeStock,
        StockAction.UPDATE,
        username,
        `Updated ${completeStock.product}${shadeDetails}`,
        oldData,
        newData,
      );
      
      return completeStock;
    } catch (error) {
      console.error('Simple update error:', error);
      throw error;
    }
  }

  // ADD THIS SHADE UPDATE HELPER:
  private async simpleUpdateShades(stockId: number, shadesArray: any[]): Promise<any[]> {
    const changes = [];
    
    // Get existing shades
    const existingShades = await this.shadeRepository.find({ where: { stockId } });
    const existingMap = new Map<number, Shade>();
    existingShades.forEach(shade => existingMap.set(shade.id, shade));
    
    const processedIds = new Set<number>();
    
    // Process shades
    for (const shadeData of shadesArray) {
      if (shadeData.id && existingMap.has(shadeData.id)) {
        // Update existing
        const existing = existingMap.get(shadeData.id)!;
        
        // Check if changed
        const oldQuantity = existing.quantity;
        const newQuantity = Number(shadeData.quantity) || 0;
        
        const updatedShade = await this.shadeRepository.save({
          ...existing,
          colorName: shadeData.colorName || existing.colorName,
          color: shadeData.color || existing.color,
          quantity: newQuantity,
          unit: shadeData.unit || existing.unit,
          length: Number(shadeData.length) || existing.length,
          lengthUnit: shadeData.lengthUnit || existing.lengthUnit,
        });
        
        changes.push({
          action: 'updated',
          colorName: updatedShade.colorName,
          color: updatedShade.color,
          shadeId: updatedShade.id,
          oldQuantity,
          newQuantity
        });
        
        processedIds.add(shadeData.id);
      } else {
        // Create new
        const newShade = this.shadeRepository.create({
          colorName: shadeData.colorName,
          color: shadeData.color || '#000000',
          quantity: Number(shadeData.quantity) || 0,
          unit: shadeData.unit || 'pcs',
          length: Number(shadeData.length) || 0,
          lengthUnit: shadeData.lengthUnit || 'meters',
          stockId: stockId,
        });
        
        const saved = await this.shadeRepository.save(newShade);
        changes.push({
          action: 'created',
          colorName: saved.colorName,
          color: saved.color,
          shadeId: saved.id
        });
      }
    }
    
    // Delete shades not in array
    for (const [id, shade] of existingMap.entries()) {
      if (!processedIds.has(id)) {
        await this.shadeRepository.remove(shade);
        changes.push({
          action: 'deleted',
          colorName: shade.colorName,
          color: shade.color,
          shadeId: shade.id
        });
      }
    }
    
    return changes;
  }

  private async updateShades(stockId: number, shadesData: any[]): Promise<any[]> {
    const changes = [];

    for (const shadeData of shadesData) {
      if (shadeData.id) {
        // Update existing shade
        const existingShade = await this.shadeRepository.findOne({
          where: { id: shadeData.id, stockId },
        });

        if (existingShade) {
          const updatedShade = this.shadeRepository.merge(existingShade, {
            colorName: shadeData.colorName,
            color: shadeData.color,
            quantity: Number(shadeData.quantity) || 0,
            unit: shadeData.unit,
            length: Number(shadeData.length) || 0,
            lengthUnit: shadeData.lengthUnit,
          });
          await this.shadeRepository.save(updatedShade);

          changes.push({
            action: 'updated',
            colorName: updatedShade.colorName,
            shadeId: updatedShade.id,
          });
        }
      } else {
        // Create new shade
        const newShade = this.shadeRepository.create({
          colorName: shadeData.colorName,
          color: shadeData.color,
          quantity: Number(shadeData.quantity) || 0,
          unit: shadeData.unit,
          length: Number(shadeData.length) || 0,
          lengthUnit: shadeData.lengthUnit,
          stockId: stockId,
        });
        const savedShade = await this.shadeRepository.save(newShade);

        changes.push({
            action: 'created',
            colorName: savedShade.colorName,
            shadeId: savedShade.id,
          });
        }
      }

      return changes;
    }

    // Helper method to get image hash as a Promise
    private async getImageHash(path: string): Promise<string> {
      return new Promise((resolve, reject) => {
        // Correct usage based on image-hash documentation
        // Parameters: (imagePath, bits, callback)
        imageHash(path, 16, (error: Error, data: string) => {
          if (error) {
            console.error('Image hash error:', error);
            reject(error);
          } else {
            resolve(data);
          }
        });
      });
    }

  // ---------------------------------------------------------------------------
  // Modern image-similarity helpers (CLIP embeddings via @xenova/transformers)
  // ---------------------------------------------------------------------------
  private async getClipExtractor() {
    if (!this.clipExtractorPromise) {
      this.clipExtractorPromise = (async () => {
        try {
          const { pipeline } = await import('@xenova/transformers');
          return await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32');
        } catch (err) {
          console.error('Failed to load CLIP pipeline:', err);
          return null;
        }
      })();
    }
    return this.clipExtractorPromise;
  }

  private async getImageEmbedding(imagePath: string): Promise<number[] | null> {
    const extractor = await this.getClipExtractor();
    if (!extractor) return null;

    try {
      // pooling + normalize returns a single vector we can cosine-compare
      const output = await extractor(imagePath, {
        pooling: 'mean',
        normalize: true,
      });

      const data =
        (output as any)?.data ??
        (output as any)?.tensor?.data ??
        (Array.isArray(output) ? output : null);

      if (!data) return null;

      const arr = Array.from(data as Iterable<number>);
      // Cache by path to avoid recomputing on repeated searches
      this.embeddingCache.set(imagePath, arr);
      return arr;
    } catch (err) {
      console.error('Failed to compute embedding for', imagePath, err);
      return null;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a?.length || !b?.length || a.length !== b.length) return -1;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return -1;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

    async searchByPhoto(uploadedPath: string): Promise<Stock[]> {
      const cleanup = () => {
        try {
          if (existsSync(uploadedPath)) {
            unlinkSync(uploadedPath);
          }
        } catch (err) {
          console.error('Failed to clean uploaded file:', err);
        }
      };

      try {
        const stocks = await this.stockRepository.find({
          relations: ['shades'],
        });

      // First try CLIP embedding similarity for better recall/precision
      const uploadedEmbedding =
        this.embeddingCache.get(uploadedPath) ??
        (await this.getImageEmbedding(uploadedPath));

      if (uploadedEmbedding && uploadedEmbedding.length) {
        const clipMatches: { stock: Stock; score: number }[] = [];

        for (const stock of stocks) {
          if (!stock.imagePath) continue;
          const fullPath = `.${stock.imagePath}`;

          const cached = this.embeddingCache.get(fullPath);
          const stockEmbedding =
            cached ?? (await this.getImageEmbedding(fullPath));

          if (!stockEmbedding) continue;

          const sim = this.cosineSimilarity(uploadedEmbedding, stockEmbedding);
          // CLIP similarities are in [-1,1]; closer to 1 is better
          if (sim >= 0.75) {
            clipMatches.push({ stock, score: sim });
          }
        }

        if (clipMatches.length) {
          clipMatches.sort((a, b) => b.score - a.score);
          return clipMatches.map((m) => m.stock);
        }
        // fall through to hash if embeddings produced but no close matches
      }

      // Fallback to perceptual hash if CLIP unavailable or no matches found
      let uploadedHash: string;
      try {
        uploadedHash = await this.getImageHash(uploadedPath);
        console.log('Uploaded image hash:', uploadedHash);
      } catch (error) {
        console.error('Error hashing uploaded image:', error);
        return []; // Return empty array if upload hash fails
      }

      const hashMatches: { stock: Stock; score: number }[] = [];

      for (const stock of stocks) {
        if (!stock.imagePath) continue;

        const fullPath = `.${stock.imagePath}`;
        try {
          const stockHash: string = await this.getImageHash(fullPath);

          // Compare hamming distance between hashes
          const score = this.hammingDistance(uploadedHash, stockHash);
          console.log(`Stock ${stock.stockId} hash score:`, score);

          if (score < 25) { // lower = more similar
            hashMatches.push({ stock, score });
          }
        } catch (error) {
          console.log('Hash error for', fullPath, error);
          continue;
        }
      }

      // Sort best match first
      hashMatches.sort((a, b) => a.score - b.score);

      return hashMatches.map(m => m.stock);
      } catch (error) {
        console.error('Error in searchByPhoto:', error);
        return [];
      } finally {
        cleanup();
      }
    }

    private hammingDistance(a: string, b: string): number {
      let dist = 0;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) dist++;
      }
      return dist;
    }

    async adjustStock(id: number, adjustStockDto: AdjustStockDto, username: string): Promise<Stock> {
      try {
        const stock = await this.findOne(id);
        const oldQuantity = stock.quantity;
        const oldData = this.prepareCompleteStockData(stock);

        stock.quantity += adjustStockDto.quantity;
        const updatedStock = await this.stockRepository.save(stock);

        const completeStock = await this.stockRepository.findOne({
          where: { id: updatedStock.id },
          relations: ['shades'],
        });

        const actionType = adjustStockDto.quantity > 0 ? 'INCREMENT' : 'DECREMENT';
        const absoluteQuantity = Math.abs(adjustStockDto.quantity);

        await this.trackingService.logAction(
          completeStock,
          StockAction.ADJUST,
          username,
          `Stock ${actionType}: ${completeStock.product} | ${absoluteQuantity} units | From: ${oldQuantity} → To: ${completeStock.quantity} | Notes: ${adjustStockDto.notes || 'No notes provided'}`,
          oldData,
          this.prepareCompleteStockData(completeStock),
        );

        return completeStock;
      } catch (error) {
        console.error('Error adjusting stock:', error);
        throw error;
      }
    }

    async remove(id: number, username: string): Promise<void> {
      try {
        const stock = await this.stockRepository.findOne({
          where: { id },
          relations: ['shades'],
        });

        if (!stock) {
          throw new NotFoundException(`Stock with ID ${id} not found`);
        }

        const stockData = this.prepareCompleteStockData(stock);

        // DELETE IMAGE FROM DISK
        if (stock.imagePath) {
          const imgPath = `.${stock.imagePath}`;
          if (existsSync(imgPath)) {
            try {
              unlinkSync(imgPath);
              console.log("Deleted image:", imgPath);
            } catch (err) {
              console.log("Error deleting image:", err);
            }
          }
        }

        await this.trackingService.logAction(
          stock,
          StockAction.DELETE,
          username,
          `DELETED: ${stock.product} (${stock.stockId}) and ${stock.shades?.length || 0} associated shades`,
          stockData,
          null,
        );

        await this.stockRepository.remove(stock);
      } catch (error) {
        console.error('Error deleting stock:', error);
        throw error;
      }
    }

    async findAll(): Promise<Stock[]> {
      return await this.stockRepository.find({
        relations: ['shades'],
        order: { createdAt: 'DESC' },
      });
    }

    async findOne(id: number): Promise<Stock> {
      const stock = await this.stockRepository.findOne({
        where: { id },
        relations: ['shades'],
      });

      if (!stock) {
        throw new NotFoundException(`Stock with ID ${id} not found`);
      }

      return stock;
    }

    async search(searchDto: SearchStockDto): Promise<Stock[]> {
      const query = this.stockRepository.createQueryBuilder('stock')
        .leftJoinAndSelect('stock.shades', 'shades');

      if (searchDto.name) {
        query.andWhere('stock.product LIKE :name', { name: `%${searchDto.name}%` });
      }

      if (searchDto.category) {
        query.andWhere('stock.category LIKE :category', { category: `%${searchDto.category}%` });
      }

      return await query.getMany();
    }

    async getLowStock(threshold: number = 10): Promise<Stock[]> {
      return await this.stockRepository
        .createQueryBuilder('stock')
        .where('stock.quantity <= :threshold', { threshold })
        .leftJoinAndSelect('stock.shades', 'shades')
        .orderBy('stock.quantity', 'ASC')
        .getMany();
    }

    async getStockTracking(stockId: number) {
      return await this.trackingService.getStockTracking(stockId);
    }

    async getAllTracking() {
      return await this.trackingService.getRecentActions(1000);
    }

    async searchByImage(filename: string): Promise<Stock[]> {
      const query = this.stockRepository.createQueryBuilder('stock')
        .leftJoinAndSelect('stock.shades', 'shades');

      if (filename && filename.trim().length > 0) {
        query.where('stock.imagePath LIKE :img', { img: `%${filename}%` });
      } else {
        query.where('stock.imagePath IS NOT NULL');
      }

      return await query.getMany();
    }

    // ---------- Patch uploadImage to NOT generate embedding ----------
    async uploadImage(id: number, imagePath: string, username: string): Promise<Stock> {
      console.log(`Uploading image for stock ${id}: ${imagePath}`);
      const stock = await this.findOne(id);
      const oldImagePath = stock.imagePath;

      // Update imagePath in DB only
      await this.stockRepository.update(id, { imagePath });
      console.log(`Updated stock ${id} imagePath in DB to: ${imagePath}`);

      // Fetch updated entity
      const updated = await this.findOne(id);

      await this.trackingService.logAction(
        updated,
        StockAction.IMAGE_UPLOAD,
        username,
        `Image ${oldImagePath ? 'updated' : 'uploaded'} for: ${updated.product} (${updated.stockId})`,
        { oldImagePath },
        { newImagePath: imagePath }
      );

      return updated;
    }

    // REMOVED: searchByPhotoTensorFlow() method - using only image-hash based search

    // Helper methods
    private prepareCompleteStockData(stock: Stock): any {
      return {
        id: stock.id,
        stockId: stock.stockId,
        product: stock.product,
        category: stock.category,
        quantity: stock.quantity,
        cost: stock.cost,
        price: stock.price,
        imagePath: stock.imagePath,
        createdAt: stock.createdAt,
        updatedAt: stock.updatedAt,
        shades: stock.shades ? stock.shades.map(shade => ({
          id: shade.id,
          colorName: shade.colorName,
          color: shade.color,
          quantity: shade.quantity,
          unit: shade.unit,
          length: shade.length,
          lengthUnit: shade.lengthUnit,
          createdAt: shade.createdAt,
          updatedAt: shade.updatedAt,
        })) : [],
      };
    }

    private getChangedFields(oldData: any, newData: any): any {
      const changes = {};
      const trackableFields = ['product', 'category', 'quantity', 'cost', 'price', 'imagePath'];

      trackableFields.forEach(key => {
        if (oldData[key] !== newData[key]) {
          changes[key] = {
            old: oldData[key],
            new: newData[key]
          };
        }
      });

      return changes;
    }

    async getStockAlerts(shadeLowThreshold = 5, shadeHighThreshold = 250, stockLowThreshold = 5) {
      const stocks = await this.stockRepository.find({
        relations: ['shades'],
      });

      const lowShadeAlerts = [];
      const highShadeAlerts = [];
      const lowStocks = [];

      for (const stock of stocks) {
        if (stock.shades && stock.shades.length > 0) {
          for (const shade of stock.shades) {
            if (shade.quantity <= shadeLowThreshold) {
              lowShadeAlerts.push({
                stockId: stock.id,
                stockCode: stock.stockId,
                product: stock.product,
                shadeId: shade.id,
                shadeName: shade.colorName,
                quantity: shade.quantity,
              });
            } else if (shade.quantity >= shadeHighThreshold) {
              highShadeAlerts.push({
                stockId: stock.id,
                stockCode: stock.stockId,
                product: stock.product,
                shadeId: shade.id,
                shadeName: shade.colorName,
                quantity: shade.quantity,
              });
            }
          }
        } else if (stock.quantity <= stockLowThreshold) {
          lowStocks.push({
            stockId: stock.id,
            stockCode: stock.stockId,
            product: stock.product,
            quantity: stock.quantity,
          });
        }
      }

      return {
        thresholds: {
          shadeLow: shadeLowThreshold,
          shadeHigh: shadeHighThreshold,
          stockLow: stockLowThreshold,
        },
        counts: {
          lowShades: lowShadeAlerts.length,
          highShades: highShadeAlerts.length,
          lowStocks: lowStocks.length,
        },
        lowShadeAlerts,
        highShadeAlerts,
        lowStocks,
      };
    }

    async getInventorySummary() {
      const stocks = await this.stockRepository.find({
        relations: ['shades'],
      });

      const trackingResponse = await this.trackingService.getAllTracking(5000, 0);
      const trackingMap = new Map<number, StockTracking[]>();
      trackingResponse.data.forEach((entry) => {
        if (!trackingMap.has(entry.stockId)) {
          trackingMap.set(entry.stockId, []);
        }
        trackingMap.get(entry.stockId).push(entry);
      });

      const items = stocks.map((stock) =>
        this.buildMovementItem(stock, trackingMap.get(stock.id) || []),
      );

      const totals = {
        totalProducts: items.length,
        withShades: items.filter((item) => item.hasShades).length,
        withoutShades: items.filter((item) => !item.hasShades).length,
        totalShades: items.reduce((sum, item) => sum + item.shadeDetails.totalShades, 0),
        totalAdded: items.reduce((sum, item) => sum + item.totalAdded, 0),
        totalRemoved: items.reduce((sum, item) => sum + item.totalRemoved, 0),
        currentStock: items.reduce((sum, item) => sum + item.currentStock, 0),
      };

      return { totals, items };
    }

    async getStockActivitySummary(stockId: number) {
      const stock = await this.findOne(stockId);
      const tracking = await this.trackingService.getStockTracking(stockId);

      const quantityChanges = tracking
        .map((entry) => this.extractQuantityChange(entry))
        .filter((change) => change.changeAmount !== 0);

      const summary = {
        totalActivities: tracking.length,
        created: tracking.filter((t) => t.action === StockAction.CREATE).length,
        updated: tracking.filter((t) => t.action === StockAction.UPDATE).length,
        adjusted: tracking.filter((t) => t.action === StockAction.ADJUST).length,
        deleted: tracking.filter((t) => t.action === StockAction.DELETE).length,
        totalShades: stock.shades?.length || 0,
        totalShadeQuantity: stock.shades?.reduce((sum, shade) => sum + (shade.quantity || 0), 0) || 0,
        totalShadeLength: stock.shades?.reduce((sum, shade) => sum + (shade.length || 0), 0) || 0,
      };

      const shadeAnalytics = this.aggregateShadeAnalytics(stock.shades || [], tracking);
      const activityByPeriod = this.buildActivityByPeriod(tracking);

      return {
        stock,
        tracking,
        summary,
        quantityChanges,
        shadeAnalytics,
        activityByPeriod,
      };
    }

    private buildMovementItem(stock: Stock, entries: StockTracking[]) {
      const sortedEntries = [...entries].sort(
        (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime(),
      );
      const hasShades = stock.shades && stock.shades.length > 0;
      const currentStock = hasShades
        ? stock.shades.reduce((sum, shade) => sum + (shade.quantity || 0), 0)
        : stock.quantity;

      let totalAdded = 0;
      let totalRemoved = 0;
      const quantityChanges = [];

      sortedEntries.forEach((entry) => {
        const change = this.extractQuantityChange(entry);
        if (change.changeAmount > 0) {
          if (change.changeType === 'increase') {
            totalAdded += change.changeAmount;
          } else if (change.changeType === 'decrease') {
            totalRemoved += change.changeAmount;
          }
          quantityChanges.push(change);
        }
      });

      return {
        stockId: stock.stockId,
        product: stock.product,
        category: stock.category,
        currentStock,
        totalAdded,
        totalRemoved,
        netChange: totalAdded - totalRemoved,
        lastActivity: sortedEntries[0]?.performedAt || stock.updatedAt,
        lastAction: sortedEntries[0]?.action || StockAction.CREATE,
        cost: stock.cost,
        price: stock.price,
        stockItem: stock,
        hasShades,
        shadeDetails: {
          totalShades: stock.shades?.length || 0,
          shadeQuantities:
            stock.shades?.map((shade) => ({
              colorName: shade.colorName,
              quantity: shade.quantity,
              color: shade.color,
            })) || [],
        },
        quantityChanges,
        updatedAt: stock.updatedAt,
        createdAt: stock.createdAt,
      };
    }

    private extractQuantityChange(entry: StockTracking) {
      let oldQuantity: number | null = null;
      let newQuantity: number | null = null;
      let changeAmount = 0;
      let changeType: 'increase' | 'decrease' | 'none' = 'none';
      let isShadeUpdate = false;
      let shadeName: string | undefined;

      if (
        typeof entry?.oldData?.quantity === 'number' &&
        typeof entry?.newData?.quantity === 'number'
      ) {
        oldQuantity = entry.oldData.quantity;
        newQuantity = entry.newData.quantity;
        changeAmount = Math.abs(newQuantity - oldQuantity);
        if (newQuantity > oldQuantity) {
          changeType = 'increase';
        } else if (newQuantity < oldQuantity) {
          changeType = 'decrease';
        }
      } else if (
        entry?.oldData?.colorName &&
        typeof entry?.oldData?.quantity === 'number' &&
        typeof entry?.newData?.quantity === 'number'
      ) {
        oldQuantity = entry.oldData.quantity;
        newQuantity = entry.newData.quantity;
        changeAmount = Math.abs(newQuantity - oldQuantity);
        if (newQuantity > oldQuantity) {
          changeType = 'increase';
        } else if (newQuantity < oldQuantity) {
          changeType = 'decrease';
        }
        isShadeUpdate = true;
        shadeName = entry.oldData.colorName || entry.newData.colorName;
      } else if (entry.description) {
        const match = entry.description.match(/(\d+)\s*→\s*(\d+)/);
        if (match) {
          oldQuantity = parseInt(match[1], 10);
          newQuantity = parseInt(match[2], 10);
          changeAmount = Math.abs(newQuantity - oldQuantity);
          changeType = newQuantity > oldQuantity ? 'increase' : 'decrease';
        }
      }

      return {
        oldQuantity,
        newQuantity,
        changeAmount,
        changeType,
        performedAt: entry.performedAt,
        performedBy: entry.performedBy,
        action: entry.action,
        description: entry.description,
        isShadeUpdate,
        shadeName,
      };
    }

    private aggregateShadeAnalytics(shades: Shade[], tracking: StockTracking[]) {
      const analyticsMap = new Map<number, any>();

      shades.forEach((shade) => {
        analyticsMap.set(shade.id, {
          shadeId: shade.id,
          colorName: shade.colorName,
          color: shade.color,
          currentQuantity: shade.quantity,
          currentLength: shade.length,
          unit: shade.unit,
          lengthUnit: shade.lengthUnit,
          totalReductions: 0,
          totalAdditions: 0,
          reductionCount: 0,
          additionCount: 0,
          lastUpdated: shade.updatedAt,
        });
      });

      tracking.forEach((entry) => {
        if (
          entry.oldData?.colorName &&
          typeof entry.oldData?.quantity === 'number' &&
          typeof entry.newData?.quantity === 'number'
        ) {
          const shadeId = entry.oldData.id || entry.newData?.id;
          if (!shadeId) return;

          if (!analyticsMap.has(shadeId)) {
            analyticsMap.set(shadeId, {
              shadeId,
              colorName: entry.oldData.colorName,
              color: entry.oldData.color,
              currentQuantity: entry.newData.quantity,
              currentLength: entry.newData.length,
              unit: entry.newData.unit,
              lengthUnit: entry.newData.lengthUnit,
              totalReductions: 0,
              totalAdditions: 0,
              reductionCount: 0,
              additionCount: 0,
              lastUpdated: entry.performedAt,
            });
          }

          const analytics = analyticsMap.get(shadeId);
          const delta = entry.newData.quantity - entry.oldData.quantity;
          if (delta > 0) {
            analytics.totalAdditions += delta;
            analytics.additionCount += 1;
          } else if (delta < 0) {
            analytics.totalReductions += Math.abs(delta);
            analytics.reductionCount += 1;
          }
          analytics.currentQuantity = entry.newData.quantity;
          analytics.currentLength = entry.newData.length;
          analytics.lastUpdated = entry.performedAt;
        }
      });

      return Array.from(analyticsMap.values());
    }

    private buildActivityByPeriod(tracking: StockTracking[]) {
      const buckets = new Map<string, any>();

      tracking.forEach((entry) => {
        const date = new Date(entry.performedAt);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        if (!buckets.has(key)) {
          buckets.set(key, {
            period: new Date(date.getFullYear(), date.getMonth(), 1),
            stockAdded: 0,
            stockReduced: 0,
            shadesAdded: 0,
            shadesRemoved: 0,
            activities: 0,
          });
        }
        const bucket = buckets.get(key);
        bucket.activities += 1;

        const change = this.extractQuantityChange(entry);
        if (change.changeAmount > 0) {
          if (change.isShadeUpdate) {
            if (change.changeType === 'increase') {
              bucket.shadesAdded += change.changeAmount;
            } else {
              bucket.shadesRemoved += change.changeAmount;
            }
          } else {
            if (change.changeType === 'increase') {
              bucket.stockAdded += change.changeAmount;
            } else {
              bucket.stockReduced += change.changeAmount;
            }
          }
        }
      });

      return Array.from(buckets.values())
        .sort((a, b) => a.period.getTime() - b.period.getTime())
        .map((bucket) => ({
          period: bucket.period.toISOString(),
          stockAdded: bucket.stockAdded,
          stockReduced: bucket.stockReduced,
          shadesAdded: bucket.shadesAdded,
          shadesRemoved: bucket.shadesRemoved,
          activities: bucket.activities,
        }));
    }
  }