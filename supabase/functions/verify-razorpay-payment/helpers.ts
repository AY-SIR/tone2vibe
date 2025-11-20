export function generateInvoiceHTML(invoiceNumber, payment, profile, razorpayPaymentId, razorpayOrderId) {
  const wordCount = payment.plan ? 0 : Math.floor(payment.amount / 100 / (payment.plan === 'premium' ? 9 : 11) * 1000);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #000; padding-bottom: 20px; }
    .company-name { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
    .invoice-details { margin-bottom: 30px; }
    .details-row { display: flex; justify-content: space-between; margin: 10px 0; }
    .label { font-weight: bold; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    .table th { background-color: #f2f2f2; }
    .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">Tone2Vibe</div>
    <div>https://tone2vibe.in</div>
  </div>

  <div class="invoice-details">
    <h2>INVOICE</h2>
    <div class="details-row">
      <div><span class="label">Invoice Number:</span> ${invoiceNumber}</div>
      <div><span class="label">Date:</span> ${new Date().toLocaleDateString('en-IN')}</div>
    </div>
    <div class="details-row">
      <div><span class="label">Customer:</span> ${profile?.full_name || 'User'}</div>
      <div><span class="label">Email:</span> ${profile?.email || ''}</div>
    </div>
    <div class="details-row">
      <div><span class="label">Payment ID:</span> ${razorpayPaymentId}</div>
      <div><span class="label">Order ID:</span> ${razorpayOrderId}</div>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Description</th>
        <th>Quantity</th>
        <th>Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${payment.plan ? `${payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1)} Plan - Monthly Subscription` : `Word Purchase - ${wordCount.toLocaleString()} words`}</td>
        <td>1</td>
        <td>₹${(payment.amount / 100).toFixed(2)}</td>
        <td>₹${(payment.amount / 100).toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="total">
    Total: ₹${(payment.amount / 100).toFixed(2)}
  </div>

  <div class="footer">
    <p>Thank you for your business!</p>
    <p>For support, contact: support@tone2vibe.in</p>
    <p>This is a computer-generated invoice and does not require a signature.</p>
  </div>
</body>
</html>`;
}
