UPDATE Purchase p
JOIN Supplier s ON p.supplierId = s.id
SET p.supplierName = s.name
WHERE p.supplierName IS NULL OR p.supplierName = '';
