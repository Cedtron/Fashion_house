# Debug Fixes Applied

## Issues Addressed

### 1. **Image Upload Not Persisting** ✅

**Root Cause**: Axios interceptor was forcing `Content-Type: application/json` on FormData requests. This breaks multipart boundary that browsers need to set.

**Fix Applied**:

- **File**: `front-end/src/utils/axios.ts`
- Modified request interceptor to detect FormData and remove `Content-Type` header
- Added console logging to track when this happens
- Now axios will let the browser automatically set the correct `Content-Type: multipart/form-data; boundary=...`

**Changes**:

```typescript
// Don't override Content-Type if it's FormData
if (config.data instanceof FormData) {
  delete config.headers['Content-Type'];
  console.log(
    '[axios] FormData detected, removing Content-Type to allow browser to set multipart boundary'
  );
}
```

### 2. **Delete Tracking Not Logging**

**Investigation**: Backend code is correct and should log. Issue likely one of:

- Username header not reaching DELETE endpoint (should now work with updated axios)
- Tracking service silently failing

**Debugging Steps Applied**:

- **File**: `back-end/src/stock/stock.service.ts`
- Added console logging to `remove()` method to trace execution
- **File**: `back-end/src/stock/stock.controller.ts`
- Added console logging to `uploadImage()` endpoint to track file receipt

### 3. **Image Upload Endpoint Improvements**

**File**: `back-end/src/stock/stock.controller.ts`

- Added console logging throughout file upload flow:
  - When destination directory created
  - When filename generated
  - When uploadImage endpoint called
  - When imagePath being saved to DB
- Fixed FileTypeValidator regex from `/\.(png|jpg|jpeg|webp)$/` to `/image\/(jpg|jpeg|png|webp)$/i` (more accurate)

### 4. **Frontend Image Upload Flow**

**File**: `front-end/src/pages/Stock.tsx`

- Added console logging to track:
  - When upload starts for which stock ID
  - Multipart FormData creation
  - Upload response received
  - Success/error handling
- Removed redundant Content-Type header override in axios call (now handled by interceptor)
- Added success toast message for image upload

## Testing the Fix

### Backend Console Should Show:

```
[remove] Deleting stock ID: 5, Username: john_doe
[remove] Logging DELETE action for stock SK-001 (Blue Shirt)
[remove] Stock deleted successfully

[uploadImage] Stock ID: 3, File: 1701234567-123456789.jpg, Username: john_doe
[FileUpload] Destination: ./uploads/stock
[FileUpload] Filename: 1701234567-123456789.jpg, Original: shirt.jpg
[uploadImage] Saving imagePath to DB: /uploads/stock/1701234567-123456789.jpg
```

### Browser Console Should Show:

```
[axios] Added x-username header: john_doe
[axios] FormData detected, removing Content-Type to allow browser to set multipart boundary
[onSubmit] Uploading image for stock 3 {File}
[onSubmit] Image upload response: {message: 'Image uploaded successfully', imagePath: '/uploads/stock/1701234567-123456789.jpg', stock: {...}}
```

## Files Modified

1. ✅ `front-end/src/utils/axios.ts` - Fixed FormData Content-Type handling + logging
2. ✅ `back-end/src/stock/stock.controller.ts` - Added console logging + fixed FileTypeValidator
3. ✅ `front-end/src/pages/Stock.tsx` - Added console logging to upload flow
4. ✅ `back-end/src/stock/stock.service.ts` - Added console logging to delete and upload methods

## Next Steps to Verify

1. **Run backend**: `cd back-end && npm run start:dev`
2. **Run frontend**: `cd front-end && npm run dev`
3. **Test image upload**:
   - Create/edit a stock item
   - Select an image file
   - Submit form
   - Check browser console for `[axios]` and `[onSubmit]` logs
   - Check backend console for `[FileUpload]` and `[uploadImage]` logs
   - Verify `/uploads/stock/` directory has the file
   - Verify DB `stock.imagePath` is populated
4. **Test delete**:
   - Delete a stock item
   - Check backend console for `[remove]` logs
   - Verify `stock_tracking` table has DELETE entry with correct username
