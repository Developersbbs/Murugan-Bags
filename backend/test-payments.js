const paymentsRoutes = require("./routes/payments");
console.log('Payments routes type:', typeof paymentsRoutes);
console.log('Payments routes keys:', Object.keys(paymentsRoutes));
console.log('Payments routes stack:', paymentsRoutes.stack ? paymentsRoutes.stack.length : 'no stack');
