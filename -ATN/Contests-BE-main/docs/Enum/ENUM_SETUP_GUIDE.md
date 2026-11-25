# Enum API Setup and Testing Guide

## Overview
This guide provides step-by-step instructions for setting up, testing, and maintaining the Enum API in the Contest Backend system.

## Prerequisites

### System Requirements
- Node.js 18+ with TypeScript
- Express.js server running
- Access to application constants

### Dependencies
No additional dependencies required - the Enum API uses only core Node.js modules and existing project dependencies.

## Setup Instructions

### 1. Verify Module Structure
Ensure the following files exist in `src/modules/enum/`:

```
src/modules/enum/
├── enum.controller.ts    ✓ Controller methods
├── enum.service.ts       ✓ Business logic  
├── enum.routes.ts        ✓ Route definitions
└── index.ts             ✓ Module exports
```

### 2. Register Enum Routes
The enum routes should be registered in your main application file:

```typescript
// src/app.ts or src/index.ts
import { enumRoutes } from './modules/enum';

app.use('/api/enums', enumRoutes);
```

### 3. Verify Constants Import
Check that all required enums are properly imported in `enum.service.ts`:

```typescript
import { 
  Role, 
  QuestionType, 
  Difficulty,
  ContestStatus,
  ContestantStatus,
  ContestantMatchStatus,
  RescueType,
  RescueStatus,
  AwardType,
  ControlKey,
  ControlValue 
} from '../../constants/enum';
```

### 4. Start the Server
```bash
npm run dev
# or
npm start
```

## Testing Guide

### Automated Testing

#### Using PowerShell Script
```powershell
# Run comprehensive enum API tests
.\scripts\test-enum-api.ps1
```

#### Manual PowerShell Commands
```powershell
# Test server health
$baseUrl = "http://localhost:3000"
Invoke-RestMethod -Uri "$baseUrl/api/enums" -Method GET

# Test all endpoints
$endpoints = @(
    "/api/enums",
    "/api/enums/names", 
    "/api/enums/QuestionType",
    "/api/enums/QuestionType/values",
    "/api/enums/QuestionType/options"
)

foreach ($endpoint in $endpoints) {
    Write-Host "Testing: $endpoint"
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl$endpoint" -Method GET
        Write-Host "✓ Success: $($response.message)" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
```

### Manual Testing with cURL

#### Get All Enums
```bash
curl -X GET http://localhost:3000/api/enums
```

#### Get Enum Names
```bash
curl -X GET http://localhost:3000/api/enums/names
```

#### Get Specific Enum
```bash
curl -X GET http://localhost:3000/api/enums/QuestionType
```

#### Get Enum Values
```bash
curl -X GET http://localhost:3000/api/enums/QuestionType/values
```

#### Get Enum Options
```bash
curl -X GET http://localhost:3000/api/enums/QuestionType/options
```

### Browser Testing
Navigate to these URLs in your browser:
- `http://localhost:3000/api/enums`
- `http://localhost:3000/api/enums/names`
- `http://localhost:3000/api/enums/QuestionType`
- `http://localhost:3000/api/enums/QuestionType/options`

### Testing Error Cases

#### Invalid Enum Name
```bash
curl -X GET http://localhost:3000/api/enums/InvalidEnum
# Expected: 404 Not Found
```

#### Malformed Request
```bash
curl -X POST http://localhost:3000/api/enums
# Expected: 405 Method Not Allowed (if POST not supported)
```

## Validation Checklist

### ✅ Functional Tests
- [ ] All enums return successfully
- [ ] Enum names endpoint works
- [ ] Specific enum lookup works
- [ ] Values endpoint returns arrays
- [ ] Options endpoint returns label/value pairs
- [ ] Invalid enum returns 404
- [ ] All responses follow standard format

### ✅ Data Integrity Tests
- [ ] All enum values match constants
- [ ] Vietnamese labels are present
- [ ] Options format is correct (label/value)
- [ ] No missing or null values
- [ ] Consistent data structure

### ✅ Performance Tests
- [ ] Response time < 100ms
- [ ] No memory leaks
- [ ] Concurrent request handling
- [ ] Large enum handling

### ✅ Integration Tests
- [ ] Frontend can fetch and use enums
- [ ] Dropdown components populate correctly
- [ ] Form validation works with enum values
- [ ] No CORS issues

## Troubleshooting

### Common Issues

#### 1. Enum Not Found Errors
**Symptom**: 404 errors for valid enum names
**Solution**: 
- Check enum name spelling and case sensitivity
- Verify enum is imported in service
- Ensure enum is added to `enumMap`

#### 2. Missing Vietnamese Labels
**Symptom**: Labels show as enum values instead of Vietnamese text
**Solution**:
- Check `enumLabels` mapping in service
- Add missing translations
- Verify label key matches enum value

#### 3. Server Errors
**Symptom**: 500 Internal Server Error
**Solution**:
- Check server logs for detailed error
- Verify all imports are correct
- Ensure no circular dependencies

#### 4. CORS Issues
**Symptom**: Browser blocks enum API requests
**Solution**:
- Configure CORS in main app
- Add enum endpoints to allowed origins
- Check CORS middleware configuration

### Debug Mode

#### Enable Detailed Logging
```typescript
// In enum.controller.ts
console.log('Enum request:', req.params);
console.log('Enum data:', enumData);
```

#### Check Service Response
```typescript
// In enum.service.ts
console.log('Available enums:', Object.keys(this.enumMap));
console.log('Requested enum:', enumName);
```

### Log Analysis
Check application logs for:
- Request patterns
- Error frequencies  
- Performance metrics
- Usage statistics

## Maintenance Tasks

### Regular Maintenance

#### Weekly Tasks
- [ ] Review API usage logs
- [ ] Check for new enum requirements
- [ ] Validate data consistency
- [ ] Monitor performance metrics

#### Monthly Tasks
- [ ] Update documentation
- [ ] Review and update Vietnamese translations
- [ ] Performance optimization review
- [ ] Security assessment

### Updates and Changes

#### Adding New Enums
1. Add enum to `constants/enum.ts`
2. Import in `enum.service.ts`
3. Add to `enumMap`
4. Add Vietnamese labels to `enumLabels`
5. Test all endpoints
6. Update documentation

#### Modifying Existing Enums
1. Update enum in constants
2. Update labels if needed
3. Test for breaking changes
4. Update frontend if necessary
5. Document changes

#### Deprecating Enums
1. Mark as deprecated in documentation
2. Add deprecation warnings to responses
3. Notify frontend teams
4. Plan removal timeline
5. Remove after grace period

## Performance Optimization

### Caching Strategy
```typescript
// Optional: Add caching for better performance
import NodeCache from 'node-cache';

const enumCache = new NodeCache({ stdTTL: 3600 }); // 1 hour

// In service methods
const cachedResult = enumCache.get(cacheKey);
if (cachedResult) return cachedResult;
```

### Response Optimization
- Minimize response payload size
- Use appropriate HTTP headers
- Enable gzip compression
- Consider CDN for static enum data

## Security Considerations

### Access Control
- Enum API is public (no authentication)
- Monitor for abuse patterns
- Rate limiting if necessary
- Log access patterns

### Data Security
- No sensitive data in enums
- Validate all inputs
- Sanitize error messages
- Regular security reviews

## Deployment Notes

### Production Checklist
- [ ] All tests pass
- [ ] Performance benchmarks met
- [ ] Error handling tested
- [ ] Logging configured
- [ ] Monitoring setup
- [ ] Documentation updated

### Environment Configuration
- Ensure consistent enum values across environments
- Validate translations in production
- Monitor API usage patterns
- Set up alerting for errors

## Support and Contact

For issues with the Enum API:
1. Check this documentation
2. Review application logs
3. Test with provided scripts
4. Contact development team if needed

## Version History

- **v1.0.0** - Initial Enum API implementation
- **v1.1.0** - Added Vietnamese labels
- **v1.2.0** - Multiple output format support
- **v1.3.0** - Complete documentation and testing suite

---

*Last updated: June 2025*
