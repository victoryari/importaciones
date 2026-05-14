SELECT id, docType, docSeries, docNumber, supplierName 
FROM Purchase 
WHERE docSeries LIKE '%T002%';
