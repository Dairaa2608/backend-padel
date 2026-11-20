export const PAYMENT_METHODS = ['CARD', 'PSE', 'CASH']

export const simulatePayment = (paymentMethod) => ({
  paymentMethod,
  paymentStatus: paymentMethod === 'CASH' ? 'PENDING' : 'PAID',
  paymentDate: new Date(),
})
